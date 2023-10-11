/**
 * Netlify generated code
 */
const original = require('./.netlify/temp/next.config.js')

module.exports = {
  ...original,
  output: 'standalone',
  experimental: {
    ...original.experimental,
    // incrementalCacheHandlerPath: require.resolve('./.netlify/temp/cache-handler.js'),
  },
}
