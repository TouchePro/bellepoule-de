const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const common = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@database': path.resolve(__dirname, 'src/database'),
    },
  },
  // electron et better-sqlite3 (natif) ne peuvent pas être bundlés
  // bufferutil / utf-8-validate : dépendances optionnelles natives de ws (socket.io)
  externals: {
    electron: 'commonjs electron',
    'better-sqlite3': 'commonjs better-sqlite3',
    bufferutil: 'commonjs bufferutil',
    'utf-8-validate': 'commonjs utf-8-validate',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: { drop_console: false },
        },
      }),
    ],
  },
  stats: { warnings: false },
};

module.exports = [
  {
    ...common,
    target: 'electron-main',
    entry: { main: './src/main/main.ts' },
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: '[name].js',
    },
  },
  {
    ...common,
    target: 'electron-preload',
    entry: { preload: './src/main/preload.ts' },
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: '[name].js',
    },
  },
];
