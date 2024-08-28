import type {
  CacheHandler,
  CacheHandlerValue,
} from 'next/dist/server/lib/incremental-cache/index.js'
import type {
  CachedFetchValue,
  CachedRouteValue,
  IncrementalCachedAppPageValue,
  IncrementalCachedPageValue,
  IncrementalCacheValue,
} from 'next/dist/server/response-cache/types.js'

export type { CacheHandlerContext } from 'next/dist/server/lib/incremental-cache/index.js'

/**
 * Shape of the cache value that is returned from CacheHandler.get or passed to CacheHandler.set
 */
type CachedRouteValueForMultipleVersions = Omit<CachedRouteValue, 'kind'> & {
  kind: 'ROUTE' | 'APP_ROUTE'
}

/**
 * Used for storing in blobs and reading from blobs
 */
export type NetlifyCachedRouteValue = Omit<CachedRouteValueForMultipleVersions, 'body'> & {
  // Next.js stores body as buffer, while we store it as base64 encoded string
  body: string
  // Next.js doesn't produce cache-control tag we use to generate cdn cache control
  // so store needed values as part of cached response data
  revalidate?: Parameters<CacheHandler['set']>[2]['revalidate']
}

/**
 * Shape of the cache value that is returned from CacheHandler.get or passed to CacheHandler.set
 */
type IncrementalCachedAppPageValueForMultipleVersions = Omit<
  IncrementalCachedAppPageValue,
  'kind'
> & {
  kind: 'APP_PAGE'
}

/**
 * Used for storing in blobs and reading from blobs
 */
export type NetlifyCachedAppPageValue = Omit<
  IncrementalCachedAppPageValueForMultipleVersions,
  'rscData'
> & {
  // Next.js stores rscData as buffer, while we store it as base64 encoded string
  rscData: string | undefined
  revalidate?: Parameters<CacheHandler['set']>[2]['revalidate']
}

/**
 * Shape of the cache value that is returned from CacheHandler.get or passed to CacheHandler.set
 */
type IncrementalCachedPageValueForMultipleVersions = Omit<IncrementalCachedPageValue, 'kind'> & {
  kind: 'PAGE' | 'PAGES'
}

/**
 * Used for storing in blobs and reading from blobs
 */
export type NetlifyCachedPageValue = IncrementalCachedPageValueForMultipleVersions & {
  revalidate?: Parameters<CacheHandler['set']>[2]['revalidate']
}

export type CachedFetchValueForMultipleVersions = Omit<CachedFetchValue, 'kind'> & {
  kind: 'FETCH'
}

type CachedRouteValueToNetlify<T> = T extends CachedRouteValue
  ? NetlifyCachedRouteValue
  : T extends IncrementalCachedPageValue
    ? NetlifyCachedPageValue
    : T extends IncrementalCachedAppPageValue
      ? NetlifyCachedAppPageValue
      : T

type MapCachedRouteValueToNetlify<T> = { [K in keyof T]: CachedRouteValueToNetlify<T[K]> }

/**
 * Used for storing in blobs and reading from blobs
 */
export type NetlifyCacheHandlerValue = MapCachedRouteValueToNetlify<CacheHandlerValue>

/**
 * Used for storing in blobs and reading from blobs
 */
export type NetlifyIncrementalCacheValue = NetlifyCacheHandlerValue['value']

// type IncrementalCacheValueToMultipleVersions<T> = T extends CachedRouteValue ?
type IncrementalCacheValueToMultipleVersions<T> = T extends CachedRouteValue
  ? CachedRouteValueForMultipleVersions
  : T extends IncrementalCachedPageValue
    ? IncrementalCachedPageValueForMultipleVersions
    : T extends IncrementalCachedAppPageValue
      ? IncrementalCachedAppPageValueForMultipleVersions
      : T extends CachedFetchValue
        ? CachedFetchValueForMultipleVersions
        : T extends CacheHandlerValue
          ? {
              [K in keyof T]: IncrementalCacheValueToMultipleVersions<T[K]>
            }
          : T

type IncrementalCacheValueForMultipleVersions =
  IncrementalCacheValueToMultipleVersions<IncrementalCacheValue>

export const isCachedPageValue = (
  value: IncrementalCacheValueForMultipleVersions,
): value is IncrementalCachedPageValueForMultipleVersions =>
  value.kind === 'PAGE' || value.kind === 'PAGES'

export const isCachedRouteValue = (
  value: IncrementalCacheValueForMultipleVersions,
): value is CachedRouteValueForMultipleVersions =>
  value.kind === 'ROUTE' || value.kind === 'APP_ROUTE'

type MapArgsOrReturn<T> = T extends readonly unknown[]
  ? { [K in keyof T]: MapArgsOrReturn<T[K]> }
  : T extends Promise<infer P>
    ? Promise<MapArgsOrReturn<P>>
    : IncrementalCacheValueToMultipleVersions<T>

type MapCacheHandlerClassMethod<T> = T extends (...args: infer Args) => infer Ret
  ? (...args: MapArgsOrReturn<Args>) => MapArgsOrReturn<Ret>
  : T

type MapCacheHandlerClass<T> = { [K in keyof T]: MapCacheHandlerClassMethod<T[K]> }

export type CacheHandlerForMultipleVersions = MapCacheHandlerClass<CacheHandler>
