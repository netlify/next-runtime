import { getStore } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import type { CacheHandler, CacheHandlerContext } from 'next/dist/server/lib/incremental-cache/index.js'

type TagManifest = { revalidatedAt: number }

const tagsManifestPath = '_netlify-cache/tags'
const blobStore = getStore('TODO')

/**
 * Netlify Cache Handler
 * (CJS format because Next.js doesn't support ESM yet)
 */
export default class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext
  revalidatedTags: string[]

  constructor(options: CacheHandlerContext) {
    this.options = options
    this.revalidatedTags = options.revalidatedTags
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

    const data: TagManifest = {
      revalidatedAt: Date.now()
    }

    try {
      blobStore.setJSON(this.tagManifestPath(tag), data)
    } catch (error: any) {
      console.warn(`Failed to update tag manifest for ${tag}`, error)
    }
    
    purgeCache({ tags: [tag] })
  }

  private async loadTagManifest(tag: string) {
    try {
      return await blobStore.get(this.tagManifestPath(tag), {type: 'json'})
    } catch (error: any) {
      console.warn(`Failed to fetch tag manifest for ${tag}`, error)
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private tagManifestPath(tag: string) {
    return [tagsManifestPath, tag].join('/')
  }
}
