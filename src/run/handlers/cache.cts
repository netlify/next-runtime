// Netlify Cache Handler
// (CJS format because Next.js doesn't support ESM yet)
//
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path/posix'

import { getDeployStore } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import type { PrerenderManifest } from 'next/dist/build/index.js'
import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants.js'
import type {
  CacheHandler,
  CacheHandlerContext,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'

// @ts-expect-error only type import of an ESM file will be removed in compiled version
import type { CacheEntry } from '../../build/plugin-context.ts'

type TagManifest = { revalidatedAt: number }

export const blobStore = getDeployStore()

// load the prerender manifest
const prerenderManifest: PrerenderManifest = JSON.parse(
  readFileSync(join(process.cwd(), '.next/prerender-manifest.json'), 'utf-8'),
)

/** Strips trailing slashes and normalizes the index root */
function toRoute(cacheKey: string): string {
  return cacheKey.replace(/\/$/, '').replace(/\/index$/, '') || '/'
}

function encodeBlobKey(key: string) {
  return Buffer.from(key.replace(/^\//, '')).toString('base64')
}

export class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext
  revalidatedTags: string[]

  constructor(options: CacheHandlerContext) {
    this.options = options
    this.revalidatedTags = options.revalidatedTags
  }

  async get(...args: Parameters<CacheHandler['get']>): ReturnType<CacheHandler['get']> {
    const [key, ctx = {}] = args

    console.debug(`[NetlifyCacheHandler.get]: ${key}`)

    const blob = (await blobStore.get(encodeBlobKey(key), {
      type: 'json',
    })) as CacheEntry | null

    // if blob is null then we don't have a cache entry
    if (!blob) {
      return null
    }

    const revalidateAfter = this.calculateRevalidate(key, blob.lastModified, ctx)
    const isStale = revalidateAfter !== false && revalidateAfter < Date.now()
    const staleByTags = await this.checkCacheEntryStaleByTags(blob, ctx.softTags)

    if (staleByTags || isStale) {
      return null
    }

    switch (blob.value.kind) {
      case 'FETCH':
        return {
          lastModified: blob.lastModified,
          value: {
            kind: blob.value.kind,
            data: blob.value.data,
            revalidate: ctx.revalidate || 1,
          },
        }

      case 'ROUTE':
        return {
          lastModified: blob.lastModified,
          value: {
            body: Buffer.from(blob.value.body),
            kind: blob.value.kind,
            status: blob.value.status,
            headers: blob.value.headers,
          },
        }
      case 'PAGE':
        return {
          lastModified: blob.lastModified,
          value: blob.value,
        }
      default:
      // TODO: system level logging not implemented
    }
    return null
  }

  async set(...args: Parameters<IncrementalCache['set']>) {
    const [key, data] = args

    console.debug(`[NetlifyCacheHandler.set]: ${key}`)

    await blobStore.setJSON(encodeBlobKey(key), {
      lastModified: Date.now(),
      value: data,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async revalidateTag(tag: string, ...args: any) {
    console.debug('NetlifyCacheHandler.revalidateTag', tag, args)

    const data: TagManifest = {
      revalidatedAt: Date.now(),
    }

    try {
      await blobStore.setJSON(encodeBlobKey(tag), data)
    } catch (error) {
      console.warn(`Failed to update tag manifest for ${tag}`, error)
    }

    purgeCache({ tags: [tag] }).catch((error) => {
      // TODO: add reporting here
      console.error(`[NetlifyCacheHandler]: Purging the cache for tag ${tag} failed`, error)
    })
  }

  /**
   * Checks if a page is stale through on demand revalidated tags
   */
  private async checkCacheEntryStaleByTags(cacheEntry: CacheEntry, softTags: string[] = []) {
    const tags =
      'headers' in cacheEntry.value
        ? cacheEntry.value.headers?.[NEXT_CACHE_TAGS_HEADER]?.split(',') || []
        : []

    const cacheTags = [...tags, ...softTags]
    const allManifests = await Promise.all(
      cacheTags.map(async (tag) => {
        const res = await blobStore
          .get(encodeBlobKey(tag), { type: 'json' })
          .then((value: TagManifest) => ({ [tag]: value }))
          .catch(console.error)
        return res || { [tag]: null }
      }),
    )

    const tagsManifest = Object.assign({}, ...allManifests) as Record<
      string,
      null | { revalidatedAt: number }
    >

    const isStale = cacheTags.some((tag) => {
      // TODO: test for this case
      if (this.revalidatedTags?.includes(tag)) {
        return true
      }

      const { revalidatedAt } = tagsManifest[tag] || {}
      return revalidatedAt && revalidatedAt >= (cacheEntry.lastModified || Date.now())
    })

    return isStale
  }

  /**
   * Retrieves the milliseconds since midnight, January 1, 1970 when it should revalidate for a path.
   */
  private calculateRevalidate(
    cacheKey: string,
    fromTime: number,
    ctx: Parameters<CacheHandler['get']>[1],
    dev?: boolean,
  ): number | false {
    // in development we don't have a prerender-manifest
    // and default to always revalidating to allow easier debugging
    if (dev) return Date.now() - 1_000

    if (ctx?.revalidate && typeof ctx.revalidate === 'number') {
      return fromTime + ctx.revalidate * 1_000
    }

    // if an entry isn't present in routes we fallback to a default
    const { initialRevalidateSeconds } = prerenderManifest.routes[toRoute(cacheKey)] || {
      initialRevalidateSeconds: 0,
    }
    // the initialRevalidate can be either set to false or to a number (representing the seconds)
    const revalidateAfter: number | false =
      typeof initialRevalidateSeconds === 'number'
        ? initialRevalidateSeconds * 1_000 + fromTime
        : initialRevalidateSeconds

    return revalidateAfter
  }
}

export default NetlifyCacheHandler
