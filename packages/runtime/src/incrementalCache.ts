/* eslint-disable class-methods-use-this */

// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, n/no-extraneous-require
const { getBlobStorage } = require('@netlify/plugin-nextjs/lib/helpers/blobStorage')

module.exports = class CacheHandler {
  async get(key) {
    const cache = await getBlobStorage(/** TODO figure out how to pass in auth parameters */)

    return await cache.get(key)
  }

  async set(key, data) {
    const cache = await getBlobStorage(/** TODO figure out how to pass in auth parameters */)

    await cache.set(key, {
      value: data,
      lastModified: Date.now(),
    })
  }

  async revalidateTag(tag: string) {
    const cache = await getBlobStorage(/** TODO figure out how to pass in auth parameters */)
    // TODO: implement
  }
}

/* eslint-enable class-methods-use-this */
