import http from 'http';
import {fork} from 'child_process';
import {join, basename} from 'path';
import {watch} from 'chokidar';
// import io from 'socket.io';
import url from 'url';

import compose from 'lodash/flowRight';
import matches from 'lodash/matches';
import reject from 'lodash/reject';
import send from 'http-middleware-metalab/middleware/send';
import status from 'http-middleware-metalab/middleware/status';
import proxy from 'http-middleware-metalab/middleware/proxy';
import connect from 'http-middleware-metalab/adapter/http';
import match from 'http-middleware-metalab/middleware/match';
import path from 'http-middleware-metalab/middleware/match/path';
import thunk from 'http-middleware-metalab/middleware/thunk';
import serve from 'http-middleware-metalab/middleware/serve';
import header from 'http-middleware-metalab/middleware/header';
import verbs from 'http-middleware-metalab/middleware/match/verbs';

import {kill} from './util';
import dispatcher from './dispatcher';

import {RENDER_NS, COMPILER_NS, SOCKET_PATH} from './config';

const xx = () => compose(
  verbs.get('/__webpack_udev', serve({
    root: join(
      __dirname,
      '..',
      'ui',
      'dist'
    ),
  })),
  compose(
    status(302),
    header('Location', '/__webpack_udev'),
    send('Redirecting to UI.')
  )
);

const yy = () => compose(
  status(404),
  send('webpack-udev-server ready.')
);

export default class Server extends http.Server {
  constructor(configs, {proxies = [], ui = true} = {}) {
    super();

    const app = compose(
      thunk((app) => {
        let result = app;
        this.on('proxies', (proxies) => {
          result = proxies.slice().sort((a, b) => {
            return a.path.split('/').length - b.path.split('/').length;
          }).reduce((result, info) => {
            return match(path(info.path), proxy(info))(result);
          }, app);
        });
        return () => result;
      }),
      ui ? xx() : yy()
    )({
      error(err) {
        // TODO: Once the error handling has been standardized, as per:
        // https://github.com/metalabdesign/http-middleware-metalab/issues/30
        // Do something useful here.
        console.log('ERROR', err);
      },
      request(req, res) {
        console.log('UNREACHABLE', req.url);
        res.end();
      },
    });

    this.compilers = {};
    this.configs = configs;
    this.proxies = [];

    this.ready = false;
    this.state = {};
    this.stats = {};

    this.on('listening', () => {
      if (this.watcher) {
        this.watcher.close();
      }
      this.watcher = watch(this.configs);
      this.watcher
        .on('add', (file) => this.load(file))
        .on('change', (file) => this.load(file))
        .on('unlink', (file) => this.unload(file))
        .on('error', (err) => this.emit('error', err));

      this.ouptut = this.fork(join(__dirname, 'render/default.js'), [], RENDER_NS);
    });

    this.on('close', () => {
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
    });

    connect(app, this);

    // io.listen has to come after the normal app because of how it
    // overwrites the request handlers.
    dispatcher(this);

    // Add custom proxies if desired.
    if (proxies) {
      proxies.forEach((proxy) => this.proxy(proxy));
    }
  }

  proxy(options) {
    const parts = url.parse(options.url);
    this.proxies.push({
      target: {
        host: parts.hostname,
        port: parts.port,
      },
      path: parts.pathname,
      ...options,
    });
    console.log(`↔️  ${parts.pathname} => ${options.url}`);
    // Update actual proxy configuration.
    this.emit('proxies', this.proxies);
  }

  unproxy(match) {
    // Delete all their registered proxies.
    this.proxies = reject(this.proxies, matches(match));
    // Update actual proxy configuration.
    this.emit('proxies', this.proxies);
  }

  load(config) {
    if (this.compilers[config]) {
      this.unload(config);
    }
    const exe = join(__dirname, 'compiler.js');
    console.log('🚀  Launching compiler for', basename(config));
    this.compilers[config] = this.fork(exe, [config], COMPILER_NS);
    return this.compilers[config];
  }

  unload(config) {
    console.log('☠️  Killing compiler for', basename(config));
    kill(this.compilers[config]);
    delete this.compilers[config];
  }

  fork(exe, args, namespace = '') {
    return fork(exe, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // IPC_URL: `http://localhost:${this.address().port}/${SOCKET_PATH}`,
        IPC_URL: `http://localhost:${this.address().port}`,
        IPC_SOCKET_NS: namespace,
      },
    });
  }
}
