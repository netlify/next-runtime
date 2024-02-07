// Netlify Cache Handler
// (CJS format because Next.js doesn't support ESM yet)
//
import { Buffer } from 'node:buffer'

import { getDeployStore, Store } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import { trace } from '@opentelemetry/api'
import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants.js'
import type {
  CacheHandler,
  CacheHandlerContext,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'

type TagManifest = { revalidatedAt: number }

const fetchBeforeNextPatchedIt = globalThis.fetch

export class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext
  revalidatedTags: string[]
  blobStore: Store
  tracer = trace.getTracer('Netlify Cache Handler')

  constructor(options: CacheHandlerContext) {
    this.options = options
    this.revalidatedTags = options.revalidatedTags
    this.blobStore = getDeployStore({ fetch: fetchBeforeNextPatchedIt })
  }

  private async encodeBlobKey(key: string) {
    const { encodeBlobKey } = await import('../../shared/blobkey.js')
    return await encodeBlobKey(key)
  }

  async get(...args: Parameters<CacheHandler['get']>): ReturnType<CacheHandler['get']> {
    return this.tracer.startActiveSpan('get cache key', async (span) => {
      const [key, ctx = {}] = args
      console.debug(`[NetlifyCacheHandler.get]: ${key}`)

      const blobKey = await this.encodeBlobKey(key)
      span.setAttributes({ key, blobKey })
      const blob = (await this.blobStore.get(blobKey, {
        type: 'json',
      })) as CacheEntry | null

      // if blob is null then we don't have a cache entry
      if (!blob) {
        span.addEvent('Cache miss', { key, blobKey })
        span.end()
        return null
      }

      const staleByTags = await this.checkCacheEntryStaleByTags(blob, ctx.softTags)

      if (staleByTags) {
        span.addEvent('Stale', { staleByTags })
        span.end()
        return null
      }

      switch (blob.value.kind) {
        case 'FETCH':
          span.addEvent('FETCH', { lastModified: blob.lastModified, revalidate: ctx.revalidate })
          span.end()
          return {
            lastModified: blob.lastModified,
            value: {
              kind: blob.value.kind,
              data: blob.value.data,
              revalidate: blob.value.revalidate,
            },
          }

        case 'ROUTE':
          span.addEvent('ROUTE', {
            lastModified: blob.lastModified,
            kind: blob.value.kind,
            status: blob.value.status,
          })
          span.end()
          return {
            lastModified: blob.lastModified,
            value: {
              body: Buffer.from(blob.value.body, 'base64'),
              kind: blob.value.kind,
              status: blob.value.status,
              headers: blob.value.headers,
            },
          }
        case 'PAGE':
          span.addEvent('PAGE', { lastModified: blob.lastModified })
          span.end()
          return {
            lastModified: blob.lastModified,
            value: blob.value,
          }
        default:
          span.recordException(new Error(`Unknown cache entry kind: ${blob.value.kind}`))
        // TODO: system level logging not implemented
      }
      span.end()
      return null
    })
  }

  async set(...args: Parameters<IncrementalCache['set']>) {
    return this.tracer.startActiveSpan('set cache key', async (span) => {
      const [key, data] = args
      const blobKey = await this.encodeBlobKey(key)
      const lastModified = Date.now()
      span.setAttributes({ key, lastModified, blobKey })

      console.debug(`[NetlifyCacheHandler.set]: ${key}`)

      if (data?.kind === 'ROUTE') {
        // @ts-expect-error gotta find a better solution for this
        data.body = data.body.toString('base64')
      }

      await this.blobStore.setJSON(blobKey, {
        lastModified,
        value: data,
      })
      span.end()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async revalidateTag(tag: string, ...args: any) {
    console.debug('NetlifyCacheHandler.revalidateTag', tag, args)

    const data: TagManifest = {
      revalidatedAt: Date.now(),
    }

    try {
      await this.blobStore.setJSON(await this.encodeBlobKey(tag), data)
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
        const res = await this.blobStore
          .get(await this.encodeBlobKey(tag), { type: 'json' })
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
}

export default NetlifyCacheHandler
