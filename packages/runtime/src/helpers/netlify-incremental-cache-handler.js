console.log('loading Netlify IncrementalCache for Next.js')
module.exports = class IncrementalCache {
  // eslint-disable-next-line class-methods-use-this
  async revalidateTag() {
    await undefined
    console.log('IncrementalCache revalidateTag noop called')
  }

  // eslint-disable-next-line class-methods-use-this
  async fetchCacheKey() {
    console.log('IncrementalCache fetchCacheKey noop called')
    return await ''
  }

  // eslint-disable-next-line class-methods-use-this
  async get() {
    console.log('IncrementalCache get noop called')
    return await null
  }

  // eslint-disable-next-line class-methods-use-this
  async set() {
    console.log('IncrementalCache set noop called')
    await undefined
  }
}
