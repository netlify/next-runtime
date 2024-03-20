import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestContext = {
  debug: boolean
  responseCacheGetLastModified?: number
  responseCacheKey?: string
  usedFsRead?: boolean
  didPagesRouterOnDemandRevalidate?: boolean
  serverTiming?: string
}

type RequestContextAsyncLocalStorage = AsyncLocalStorage<RequestContext>

export function createRequestContext(debug = false): RequestContext {
  return {
    debug,
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
