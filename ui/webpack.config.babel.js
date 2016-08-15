import compose from 'lodash/fp/compose';
import babel from 'webpack-config-babel';
import path from 'path';

const context = __dirname;

export default compose(
  babel()
)({
  target: 'web',
  context,
  entry: './src/index.js',
  output: {
    filename: 'web.js',
    path: path.join(context, 'dist'),
    publicPath: '/__webpack_udev',
  },
  serve: context,
});
