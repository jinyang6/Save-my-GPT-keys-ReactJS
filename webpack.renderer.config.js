const rules = require('./webpack.rules');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.jsx?$/,
  exclude: /node_modules/,
  use: [
    {
      loader: require.resolve('babel-loader'),
      options: {
        plugins: [
          require.resolve('react-refresh/babel'),
        ],
      },
    },
  ],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  plugins: [
    new ReactRefreshWebpackPlugin(),
  ],
};