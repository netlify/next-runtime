import type { ServerResponse } from 'node:http'

import type { RequestContext } from './handlers/request-context.cjs'

// Needing to proxy the response object to intercept the revalidate call for on-demand revalidation on page routes
export const nextResponseProxy = (res: ServerResponse, requestContext: RequestContext) => {
  return new Proxy(res, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any[string], key: string) {
      const originalValue = target[key]
      if (key === 'revalidate') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return async function newRevalidate(...args: any[]) {
          requestContext.didPagesRouterOnDemandRevalidate = true
          return originalValue?.apply(target, args)
        }
      }
      return originalValue
    },
  })
}
