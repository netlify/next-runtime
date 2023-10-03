// @ts-ignore
import original from './next.config.js.orig'

module.exports = {
  ...original,
  output: 'standalone',
  experimental: {
    ...original.experimental,
    incrementalCacheHandlerPath: require.resolve('./cache-handler.js'),
  },
}
