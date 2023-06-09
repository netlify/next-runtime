// This is a stubbed version of the incremental cache for Next.js when running on Netlify.
// It is used to always return fresh requests from the origin server as Netlify
// handles the cache at the ODB platform primitive level.
//
// For more information on the incremental cache, see https://nextjs.org/docs/app/api-reference/next-config-js/incrementalCacheHandlerPath
module.exports = class NetlifyIncrementalCache {
  // eslint-disable-next-line class-methods-use-this
  async revalidateTag() {}

  // eslint-disable-next-line class-methods-use-this
  async fetchCacheKey() {
    return await ''
  }

  // eslint-disable-next-line class-methods-use-this
  async get() {
    return await null
  }

  // eslint-disable-next-line class-methods-use-this
  async set() {}
}
