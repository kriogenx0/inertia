module.exports = (api) => {
  // api.env() reads BABEL_ENV, falling back to NODE_ENV, falling back to
  // the literal string "development" if NEITHER is set — it does NOT look
  // at webpack's own --mode flag, which only controls webpack's internal
  // optimizations and what gets baked into the bundle, not the env of the
  // Node process actually running webpack/babel-loader. `npm run build`
  // must set NODE_ENV=production itself (see package.json) or every
  // "production" build silently keeps react-refresh/babel active, which
  // injects `$RefreshSig$()` calls with no matching runtime (that only
  // ReactRefreshWebpackPlugin, dev-only in webpack.config.js, provides) —
  // every component throws ReferenceError at module-eval time, before
  // React ever renders anything: a blank white page with no console output
  // reaching the DOM at all. Found via a genuinely blank first Capacitor
  // iOS build; this bug pre-dates and is unrelated to Capacitor itself —
  // it silently affects every "production" build, including the deployed
  // web app, exactly the same way.
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
