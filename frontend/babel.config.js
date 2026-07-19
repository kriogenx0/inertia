module.exports = (api) => {
  const isDev = api.env('development')

  return {
    presets: [
      ['@babel/preset-env', { targets: { esmodules: true } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: [isDev && 'react-refresh/babel'].filter(Boolean),
  }
}
