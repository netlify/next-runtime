// Netlify Cache Handler
// (CJS format because Next.js doesn't support ESM yet)
//
import { getDeployStore } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import type {
  CacheHandler,
  CacheHandlerContext,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'
import { join } from 'node:path/posix'
// @ts-expect-error This is a type only import
import type { CacheEntryValue } from '../../build/content/prerendered.js'

type TagManifest = { revalidatedAt: number }

const tagsManifestPath = '_netlify-cache/tags'
const blobStore = getDeployStore()

export default class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext
  revalidatedTags: string[]
  /** Indicates if the application is using the new appDir */
  #appDir: boolean

  constructor(options: CacheHandlerContext) {
    this.#appDir = Boolean(options._appDir)
    this.options = options
    this.revalidatedTags = options.revalidatedTags
  }

  async get(...args: Parameters<CacheHandler['get']>): ReturnType<CacheHandler['get']> {
    const [cacheKey, ctx = {}] = args
    console.log(`[NetlifyCacheHandler.get]: ${cacheKey}`)
    const blob = await this.getBlobKey(cacheKey, ctx.fetchCache)

    switch (blob?.value?.kind) {
      // TODO:
      // case 'ROUTE':
      // case 'FETCH':
      case 'PAGE':
        // TODO: determine if the page is stale based on the blob.lastModified Date.now()
        return {
          lastModified: blob.lastModified,
          value: {
            kind: 'PAGE',
            html: blob.value.html,
            pageData: blob.value.pageData,
            headers: blob.value.headers,
            status: blob.value.status,
          },
        }

      default:
        console.log('TODO: implmenet', blob)
    }
    return null
  }

  // eslint-disable-next-line require-await, class-methods-use-this
  async set(...args: Parameters<IncrementalCache['set']>) {
    const [key, data, ctx] = args
    console.log('NetlifyCacheHandler.set', key)
  }

  async revalidateTag(tag: string) {
    console.log('NetlifyCacheHandler.revalidateTag', tag)

    const data: TagManifest = {
      revalidatedAt: Date.now(),
    }

    try {
      await blobStore.setJSON(this.tagManifestPath(tag), data)
    } catch (error) {
      console.warn(`Failed to update tag manifest for ${tag}`, error)
    }

    purgeCache({ tags: [tag] })
  }

  // eslint-disable-next-line class-methods-use-this
  private tagManifestPath(tag: string) {
    return [tagsManifestPath, tag].join('/')
  }

  /**
   * Computes a cache key and tries to load it for different scenarios (app/server or fetch)
   * @param key The cache key used by next.js
   * @param fetch If it is a FETCH request or not
   * @returns the parsed data from the cache or null if not
   */
  private async getBlobKey(
    key: string,
    fetch?: boolean,
  ): Promise<
    | null
    | ({
        path: string
        isAppPath: boolean
      } & CacheEntryValue)
  > {
    const appKey = join('server/app', key)
    const pagesKey = join('server/pages', key)
    const fetchKey = join('cache/fetch-cache', key)

    if (fetch) {
      return await blobStore
        .get(fetchKey, { type: 'json' })
        .then((res) => (res !== null ? { path: fetchKey, isAppPath: false, ...res } : null))
    }

    // pagesKey needs to be requested first as there could be both sadly
    const values = await Promise.all([
      blobStore
        .get(pagesKey, { type: 'json' })
        .then((res) => ({ path: pagesKey, isAppPath: false, ...res })),
      // only request the appKey if the whole application supports the app key
      !this.#appDir
        ? Promise.resolve(null)
        : blobStore
            .get(appKey, { type: 'json' })
            .then((res) => ({ path: appKey, isAppPath: true, ...res })),
    ])

    // just get the first item out of it that is defined (either the pageRoute or the appRoute)
    const [cacheEntry] = values.filter(({ value }) => !!value)

    // TODO: set the cache tags based on the tag manifest once we have that
    // if (cacheEntry) {
    //   const cacheTags: string[] =
    //     cacheEntry.value.headers?.[NEXT_CACHE_TAGS_HEADER]?.split(',') || []
    //   const manifests = await Promise.all(
    //     cacheTags.map((tag) => blobStore.get(this.tagManifestPath(tag), { type: 'json' })),
    //   )
    //   console.log(manifests)
    // }

    return cacheEntry || null
  }
}
