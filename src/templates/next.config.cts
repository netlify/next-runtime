// @ts-ignore
import original from './.netlify/next.config.js'

module.exports = {
  ...original,
  output: 'standalone',
  experimental: {
    ...original.experimental,
    incrementalCacheHandlerPath: require.resolve('./cache-handler.js'),
  },
}
