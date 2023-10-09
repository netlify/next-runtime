/**
 * Netlify generated code
 */
const original = require('./.netlify/temp/next.config.js')

module.exports = {
  ...original,
  output: 'standalone',
  experimental: {
    ...original.experimental,
    incrementalCacheHandlerPath: require.resolve('./cache-handler.js'),
  },
}
