import {basename} from 'path';
import ipc from '../ipc';

import Stats from 'webpack/lib/Stats';

ipc.on('init', ({file}) => {
  console.log(`⏳  Loading ${basename(file)}...`);
});

ipc.on('compiling', ({file}) => {
  console.log(`🔨  Compiling ${basename(file)}...`);
});

ipc.on('stats', ({stats}) => {
  const options = {
    stats: {
      hash: false,
      cached: false,
      cachedAssets: false,
      colors: true,
      modules: false,
      chunks: false,
    },
  };

  console.log(Stats.jsonToString(stats, options));
});
