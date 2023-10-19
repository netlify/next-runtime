import { getStore } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import type { CacheHandler, CacheHandlerContext } from 'next/dist/server/lib/incremental-cache/index.js'

type TagsManifest = {
  version: 1
  items: { [tag: string]: { revalidatedAt: number } }
}

let tagsManifest: TagsManifest | undefined
const tagsManifestPath = '_netlify/tags-manifest.json'
const blobStore = getStore('TODO')

/**
 * Netlify Cache Handler
 * (CJS format because Next.js doesn't support ESM yet)
 */
export default class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext

  constructor(options: CacheHandlerContext) {
    this.options = options

    this.loadTagsManifest()
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

    await this.loadTagsManifest()
    if (!tagsManifest) {
      return
    }

    const data = tagsManifest.items[tag] || {}
    data.revalidatedAt = Date.now()
    tagsManifest.items[tag] = data

    try {
      blobStore.setJSON(tagsManifestPath, tagsManifest)
    } catch (error: any) {
      console.warn('Failed to update tags manifest.', error)
    }
    
    purgeCache({ tags: [tag] })
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadTagsManifest() {
    try {
      tagsManifest = await blobStore.get(tagsManifestPath, {type: 'json'})
    } catch (error: any) {
      console.warn('Failed to fetch tags manifest.', error)
      tagsManifest = { version: 1, items: {} }
    }
  }
}
