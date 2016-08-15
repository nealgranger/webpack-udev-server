import {join} from 'path';
import io from 'socket.io';

import {CLIENT_NS, RENDER_NS, COMPILER_NS/* , SOCKET_PATH*/} from './config';

export default (server) => {
  const compilers = {};
  const clients = {};

  const ipc = io.listen(server, /*{path: SOCKET_PATH}*/);

  console.log('listen');

  const ipcCompiler = ipc.of(COMPILER_NS);
  const ipcClient = ipc.of(CLIENT_NS);
  const ipcRender = ipc.of(RENDER_NS);

  const handleClient = (socket) => {
    // const client =
    clients[socket.id] = {id: socket.id};

    // Client just died.
    socket.on('disconnect', () => {
      delete clients[socket.id];
    });

    socket.on('watch-stats', (token) => {
      socket.join(token ? `/stats/${token}` : '/stats');
      Object.keys(compilers).forEach((key) => {
        if (!token || compilers[key].stats.token === token) {
          socket.emit('stats', compilers[key]);
        }
      });
    });

    socket.on('unwatch-stats', (token) => {
      socket.leave(token ? `/stats/${token}` : '/stats');
    });

    socket.on('watch-file', (file) => {
      socket.join(`/file${file}`);
      Object.keys(compilers).forEach((key) => {
        if (compilers[key].assets.some(({name}) => {
          return join(compilers[key].outputPath, name) === file;
        })) {
          socket.emit('stats', compilers[key], file);
        }
      });
    });

    socket.on('unwatch-file', (file) => {
      socket.leave(`/file${file}`);
    });
  };

  const handleCompiler = (socket) => {
    const compiler = compilers[socket.id] = {id: socket.id};

    // Compiler just died.
    socket.on('disconnect', () => {
      // Remove proxy.
      if (compiler.proxy) {
        server.unproxy({
          socket: socket.id,
        });
      }

      // Delete all their stats.
      const stats = compiler.stats;

      if (stats) {
        ipcClient.in('/stats').emit('rip', stats.token);
        ipcClient.in(`/stats/${stats.token}`).emit('rip', stats.token);
      }
      delete compilers[socket.id];
    });

    socket.on('init', (file) => {
      console.log('on init');
      compiler.file = file;
      ipcRender.emit('init', compiler);
    });

    socket.on('compiling', () => {
      ipcRender.emit('compiling', compiler);
    });

    // Since we are essentially just a "smart proxy" we take requests to
    // serve things at a particular URL and do so.
    socket.on('proxy', (info) => {
      compiler.proxy = true;
      // Add proxy to our internal list of proxies.
      server.proxy({
        url: info.url,
        socket: socket.id,
      });
    });

    // Take the resultant stats from child compilers and broadcast them
    // to everyone else on the IPC network. server is useful for things
    // which depend on having access to someone else stats object like a
    // server knowing the client's stats.
    socket.on('stats', (stats) => {
      compiler.stats = stats;

      ipcRender.emit('stats', compiler);

      ipcClient.in('/stats').emit('stats', stats);
      ipcClient.in(`/stats/${stats.token}`).emit('stats', stats);
      stats.assets.forEach((asset) => {
        const path = join(stats.outputPath, asset.name);
        ipcClient
          .in(`/file${path}`)
          .emit('stats', stats, path);
      });
    });
  };

  const handleRender = (/* socket */) => {
    // Render process connected.
  };

  ipcCompiler.on('connection', handleCompiler);
  ipcClient.on('connection', handleClient);
  ipcRender.on('connection', handleRender);
};
