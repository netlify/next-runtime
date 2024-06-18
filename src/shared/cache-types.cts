import type {
  CacheHandlerValue,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'
import type {
  CachedRouteValue,
  IncrementalCachedAppPageValue,
  IncrementalCacheValue,
} from 'next/dist/server/response-cache/types.js'

export type {
  CacheHandler,
  CacheHandlerContext,
  IncrementalCache,
} from 'next/dist/server/lib/incremental-cache/index.js'

export type NetlifyCachedRouteValue = Omit<CachedRouteValue, 'body'> & {
  // Next.js stores body as buffer, while we store it as base64 encoded string
  body: string
  // Next.js doesn't produce cache-control tag we use to generate cdn cache control
  // so store needed values as part of cached response data
  revalidate: Parameters<IncrementalCache['set']>[2]['revalidate']
}

export type NetlifyCachedAppPageValue = Omit<IncrementalCachedAppPageValue, 'rscData'> & {
  // Next.js stores rscData as buffer, while we store it as base64 encoded string
  rscData: string | undefined
  revalidate?: Parameters<IncrementalCache['set']>[2]['revalidate']
}

type CachedPageValue = Extract<IncrementalCacheValue, { kind: 'PAGE' }>

export type NetlifyCachedPageValue = CachedPageValue & {
  revalidate?: Parameters<IncrementalCache['set']>[2]['revalidate']
}

export type CachedFetchValue = Extract<IncrementalCacheValue, { kind: 'FETCH' }>

export type NetlifyIncrementalCacheValue =
  | Exclude<
      IncrementalCacheValue,
      CachedRouteValue | CachedPageValue | IncrementalCachedAppPageValue
    >
  | NetlifyCachedRouteValue
  | NetlifyCachedPageValue
  | NetlifyCachedAppPageValue

type CachedRouteValueToNetlify<T> = T extends CachedRouteValue
  ? NetlifyCachedRouteValue
  : T extends CachedPageValue
    ? NetlifyCachedPageValue
    : T extends IncrementalCachedAppPageValue
      ? NetlifyCachedAppPageValue
      : T

type MapCachedRouteValueToNetlify<T> = { [K in keyof T]: CachedRouteValueToNetlify<T[K]> }

export type NetlifyCacheHandlerValue = MapCachedRouteValueToNetlify<CacheHandlerValue>
