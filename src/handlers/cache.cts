import type { CacheHandler, CacheHandlerContext } from 'next/dist/server/lib/incremental-cache/index.js'

/**
 * Netlify Cache Handler
 * (CJS format because Next.js doesn't support ESM yet)
 */
export default class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext

  constructor(options: CacheHandlerContext) {
    this.options = options
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  public async get(key: string, ctx: any) {
    console.log('NetlifyCacheHandler.get', key, JSON.stringify(ctx, null, 2))
    return null
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  public async set(key: string, data: any, ctx: any) {
    console.log('NetlifyCacheHandler.set', key, JSON.stringify(data, null, 2), JSON.stringify(ctx, null, 2))
  }

  // eslint-disable-next-line class-methods-use-this, require-await
  public async revalidateTag(tag: string) {
    console.log('NetlifyCacheHandler.revalidateTag', tag)
  }
}
