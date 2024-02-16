// Netlify Cache Handler
// (CJS format because Next.js doesn't support ESM yet)
//
import { Buffer } from 'node:buffer'

import { getDeployStore, Store } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'
import { trace, type Span, SpanStatusCode } from '@opentelemetry/api'
import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants.js'
import type {
  CacheHandler,
  CacheHandlerContext,
  CacheHandlerValue,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'

import { getRequestContext } from './request-context.cjs'

type TagManifest = { revalidatedAt: number }

type TagManifestBlobCache = Record<string, Promise<TagManifest>>

const fetchBeforeNextPatchedIt = globalThis.fetch

export class NetlifyCacheHandler implements CacheHandler {
  options: CacheHandlerContext
  revalidatedTags: string[]
  blobStore: Store
  tracer = trace.getTracer('Netlify Cache Handler')
  tagManifestsFetchedFromBlobStoreInCurrentRequest: TagManifestBlobCache

  constructor(options: CacheHandlerContext) {
    this.options = options
    this.revalidatedTags = options.revalidatedTags
    this.blobStore = getDeployStore({ fetch: fetchBeforeNextPatchedIt, consistency: 'strong' })
    this.tagManifestsFetchedFromBlobStoreInCurrentRequest = {}
  }

  private async encodeBlobKey(key: string) {
    const { encodeBlobKey } = await import('../../shared/blobkey.js')
    return await encodeBlobKey(key)
  }

  private captureResponseCacheLastModified(
    cacheValue: CacheHandlerValue,
    key: string,
    getCacheKeySpan: Span,
  ) {
    if (cacheValue.value?.kind === 'FETCH') {
      return
    }

    const requestContext = getRequestContext()

    if (!requestContext) {
      // we will not be able to use request context for date header calculation
      // we will fallback to using blobs
      getCacheKeySpan.recordException(
        new Error('CacheHandler was called without a request context'),
      )
      getCacheKeySpan.setAttributes({
        severity: 'alert',
        warning: true,
      })
      return
    }

    if (requestContext.responseCacheKey && requestContext.responseCacheKey !== key) {
      // if there are multiple response-cache keys, we don't know which one we should use
      // so as a safety measure we will not use any of them and let blobs be used
      // to calculate the date header
      requestContext.responseCacheGetLastModified = undefined
      getCacheKeySpan.recordException(
        new Error(
          `Multiple response cache keys used in single request: ["${requestContext.responseCacheKey}, "${key}"]`,
        ),
      )
      getCacheKeySpan.setAttributes({
        severity: 'alert',
        warning: true,
      })
      return
    }

    requestContext.responseCacheKey = key
    if (cacheValue.lastModified) {
      // we store it to use it later when calculating date header
      requestContext.responseCacheGetLastModified = cacheValue.lastModified
    }
  }

  async get(...args: Parameters<CacheHandler['get']>): ReturnType<CacheHandler['get']> {
    return this.tracer.startActiveSpan('get cache key', async (span) => {
      try {
        const [key, ctx = {}] = args
        console.debug(`[NetlifyCacheHandler.get]: ${key}`)

        const blobKey = await this.encodeBlobKey(key)
        span.setAttributes({ key, blobKey })
        const blob = (await this.blobStore.get(blobKey, {
          type: 'json',
        })) as CacheHandlerValue | null

        // if blob is null then we don't have a cache entry
        if (!blob) {
          span.addEvent('Cache miss', { key, blobKey })
          return null
        }

        const staleByTags = await this.checkCacheEntryStaleByTags(blob, ctx.tags, ctx.softTags)

        if (staleByTags) {
          span.addEvent('Stale', { staleByTags })
          return null
        }

        this.captureResponseCacheLastModified(blob, key, span)

        switch (blob.value?.kind) {
          case 'FETCH':
            span.addEvent('FETCH', { lastModified: blob.lastModified, revalidate: ctx.revalidate })
            return {
              lastModified: blob.lastModified,
              value: blob.value,
            }

          case 'ROUTE':
            span.addEvent('ROUTE', { lastModified: blob.lastModified, status: blob.value.status })
            return {
              lastModified: blob.lastModified,
              value: {
                ...blob.value,
                body: Buffer.from(blob.value.body as unknown as string, 'base64'),
              },
            }
          case 'PAGE':
            span.addEvent('PAGE', { lastModified: blob.lastModified })
            return {
              lastModified: blob.lastModified,
              value: blob.value,
            }
          default:
            span.recordException(new Error(`Unknown cache entry kind: ${blob.value?.kind}`))
          // TODO: system level logging not implemented
        }
        return null
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error)
        }
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        span.end()
      }
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

  resetRequestCache() {
    this.tagManifestsFetchedFromBlobStoreInCurrentRequest = {}
  }

  /**
   * Checks if a cache entry is stale through on demand revalidated tags
   */
  private async checkCacheEntryStaleByTags(
    cacheEntry: CacheHandlerValue,
    tags: string[] = [],
    softTags: string[] = [],
  ) {
    let cacheTags: string[] = []

    if (cacheEntry.value?.kind === 'FETCH') {
      cacheTags = [...tags, ...softTags]
    } else if (cacheEntry.value?.kind === 'PAGE' || cacheEntry.value?.kind === 'ROUTE') {
      cacheTags = (cacheEntry.value.headers?.[NEXT_CACHE_TAGS_HEADER] as string)?.split(',') || []
    } else {
      return false
    }

    // 1. Check if revalidateTags array passed from Next.js contains any of cacheEntry tags
    if (this.revalidatedTags && this.revalidatedTags.length !== 0) {
      // TODO: test for this case
      for (const tag of this.revalidatedTags) {
        if (cacheTags.includes(tag)) {
          return true
        }
      }
    }

    // 2. If any in-memory tags don't indicate that any of tags was invalidated
    //    we will check blob store, but memoize results for duration of current request
    //    so that we only check blob store once per tag within a single request
    //    full-route cache and fetch caches share a lot of tags so this might save
    //    some roundtrips to the blob store.
    //    Additionally, we will resolve the promise as soon as we find first
    //    stale tag, so that we don't wait for all of them to resolve (but keep all
    //    running in case future `CacheHandler.get` calls would be able to use results).
    //    "Worst case" scenario is none of tag was invalidated in which case we need to wait
    //    for all blob store checks to finish before we can be certain that no tag is stale.
    return new Promise<boolean>((resolve, reject) => {
      const tagManifestPromises: Promise<boolean>[] = []

      for (const tag of cacheTags) {
        let tagManifestPromise: Promise<TagManifest> =
          this.tagManifestsFetchedFromBlobStoreInCurrentRequest[tag]

        if (!tagManifestPromise) {
          tagManifestPromise = this.encodeBlobKey(tag).then((blobKey) => {
            return this.tracer.startActiveSpan(`get tag manifest`, async (span) => {
              span.setAttributes({ tag, blobKey })
              try {
                return await this.blobStore.get(blobKey, { type: 'json' })
              } catch (error) {
                if (error instanceof Error) {
                  span.recordException(error)
                }
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error instanceof Error ? error.message : String(error),
                })
                throw error
              } finally {
                span.end()
              }
            })
          })

          this.tagManifestsFetchedFromBlobStoreInCurrentRequest[tag] = tagManifestPromise
        }

        tagManifestPromises.push(
          tagManifestPromise.then((tagManifest) => {
            const isStale = tagManifest?.revalidatedAt >= (cacheEntry.lastModified || Date.now())
            if (isStale) {
              resolve(true)
              return true
            }
            return false
          }),
        )
      }

      // make sure we resolve promise after all blobs are checked (if we didn't resolve as stale yet)
      Promise.all(tagManifestPromises)
        .then((tagManifestAreStale) => {
          resolve(tagManifestAreStale.some((tagIsStale) => tagIsStale))
        })
        .catch(reject)
    })
  }
}

export default NetlifyCacheHandler
