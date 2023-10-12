export default class CacheHandler {
  options: any
  cache: Map<string, any>

  constructor(options: any) {
    this.options = options
    this.cache = new Map()
  }

  // eslint-disable-next-line require-await
  async get(key: any) {
    return this.cache.get(key)
  }

  // eslint-disable-next-line require-await
  async set(key: any, data: any) {
    this.cache.set(key, {
      value: data,
      lastModified: Date.now(),
    })
  }
}
