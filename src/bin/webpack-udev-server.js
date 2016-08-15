#!/usr/bin/env node
import open from 'open';
import yargs from 'yargs';
import path from 'path';
import {createServer} from '../';

const argv = yargs
  .option('proxy', {
    description: 'URL to proxy to',
    type: 'string',
  })
  .option('port', {
    description: 'Port to listen on',
    type: 'number',
    default: process.env.PORT || 0,
  })
  .option('ui', {
    description: 'Include web interface',
    type: 'boolean',
  })
  .help('help')
  .argv;

global.__IN_DEV_SERVER = true;

const proxies = (
  Array.isArray(argv.proxy) ? argv.proxy : argv.proxy && [argv.proxy] || []
).map((url) => {
  return {url};
});

const configs = [...argv._];

// TODO: Right now this is just a "live" or self-hosted version of the UI. This
// should actually be compiled, hosted on its on mini-server and then proxied
// to just like any other app.
if (argv.ui) {
  configs.push(path.join(
    __dirname,
    '..',
    'ui',
    'webpack.config.babel.js'
  ));
}

const server = createServer(configs, {
  proxies: proxies,
});

/* eslint no-console: 0 */
server.on('ready', () => {
  console.log('💎  Ready.');
});

server.listen(argv.port, () => {
  const url = `http://localhost:${server.address().port}/`;
  console.log(`💎  Listening: ${url}.`);
  if (!argv.port) {
    open(url);
  }
});
