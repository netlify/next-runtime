import { AsyncLocalStorage } from 'node:async_hooks'

import { LogLevel, systemLogger } from '@netlify/functions/internal'

import type { NetlifyCachedRouteValue } from '../../shared/cache-types.cjs'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - last remaining bit to fix
// process.env.NODE_ENV = 'production'

type SystemLogger = typeof systemLogger

export type RequestContext = {
  captureServerTiming: boolean
  responseCacheGetLastModified?: number
  responseCacheKey?: string
  responseCacheTags?: string[]
  usedFsRead?: boolean
  didPagesRouterOnDemandRevalidate?: boolean
  serverTiming?: string
  routeHandlerRevalidate?: NetlifyCachedRouteValue['revalidate']
  /**
   * Track promise running in the background and need to be waited for
   */
  trackBackgroundWork: (promise: Promise<unknown>) => void
  /**
   * Promise that need to be executed even if response was already sent
   */
  backgroundWorkPromise: Promise<unknown>
  logger: SystemLogger
}

type RequestContextAsyncLocalStorage = AsyncLocalStorage<RequestContext>

export function createRequestContext(request?: Request): RequestContext {
  const backgroundWorkPromises: Promise<unknown>[] = []

  return {
    captureServerTiming: request?.headers.has('x-next-debug-logging') ?? false,
    trackBackgroundWork: (promise) => {
      backgroundWorkPromises.push(promise)
    },
    get backgroundWorkPromise() {
      return Promise.allSettled(backgroundWorkPromises)
    },
    logger: systemLogger.withLogLevel(
      request?.headers.has('x-nf-debug-logging') || request?.headers.has('x-next-debug-logging')
        ? LogLevel.Debug
        : LogLevel.Log,
    ),
  }
}

const REQUEST_CONTEXT_GLOBAL_KEY = Symbol.for('nf-request-context-async-local-storage')
let requestContextAsyncLocalStorage: RequestContextAsyncLocalStorage | undefined
function getRequestContextAsyncLocalStorage() {
  if (requestContextAsyncLocalStorage) {
    return requestContextAsyncLocalStorage
  }
  // for cases when there is multiple "copies" of this module, we can't just init
  // AsyncLocalStorage in the module scope, because it will be different for each
  // copy - so first time an instance of this module is used, we store AsyncLocalStorage
  // in global scope and reuse it for all subsequent calls
  const extendedGlobalThis = globalThis as typeof globalThis & {
    [REQUEST_CONTEXT_GLOBAL_KEY]?: RequestContextAsyncLocalStorage
  }
  if (extendedGlobalThis[REQUEST_CONTEXT_GLOBAL_KEY]) {
    return extendedGlobalThis[REQUEST_CONTEXT_GLOBAL_KEY]
  }

  const storage = new AsyncLocalStorage<RequestContext>()
  // store for future use of this instance of module
  requestContextAsyncLocalStorage = storage
  // store for future use of copy of this module
  extendedGlobalThis[REQUEST_CONTEXT_GLOBAL_KEY] = storage
  return storage
}

export const getRequestContext = () => getRequestContextAsyncLocalStorage().getStore()

export function runWithRequestContext<T>(requestContext: RequestContext, fn: () => T): T {
  return getRequestContextAsyncLocalStorage().run(requestContext, fn)
}

export function getLogger(): SystemLogger {
  return getRequestContext()?.logger ?? systemLogger
}
