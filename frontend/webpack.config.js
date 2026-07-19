const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

module.exports = (_env, argv) => {
  const isDev = argv.mode !== 'production'

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      // Relative asset paths in production so the bundle also works loaded
      // via file:// in the packaged Electron app. webpack-dev-server needs
      // an absolute root instead, or its request routing breaks.
      publicPath: isDev ? '/' : './',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.css$/,
          use: [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './index.html', favicon: './src/assets/logo.png' }),
      new webpack.DefinePlugin({
        // JSON.stringify(undefined) yields the bare `undefined` token (not a
        // string), so `?? 'default'` fallbacks in source still work when
        // these aren't set — an empty-string fallback here would break them.
        'process.env.API_URL': JSON.stringify(process.env.API_URL),
        'process.env.BYPASS_AUTH': JSON.stringify(process.env.BYPASS_AUTH),
      }),
      !isDev && new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
      isDev && new ReactRefreshWebpackPlugin(),
    ].filter(Boolean),
    devServer: {
      host: '0.0.0.0',
      port: 5174,
      historyApiFallback: true,
      hot: true,
      allowedHosts: 'all',
    },
    devtool: isDev ? 'eval-source-map' : 'source-map',
  }
}
