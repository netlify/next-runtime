import type { ServerResponse } from 'node:http'

import { purgeCache } from '@netlify/functions'

// Needing to proxy the response object to intercept the revalidate call for on-demand revalidation on page routes
export const nextResponseProxy = (res: ServerResponse) => {
  return new Proxy(res, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any[string], key: string) {
      const originalValue = target[key]
      if (key === 'revalidate') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return async function newRevalidate(...args: any[]) {
          try {
            console.debug('Purging cache for:', [args[0]])
            await purgeCache({ tags: [`_N_T_${args[0]}`] })
          } catch {
            throw new Error(
              `An internal error occurred while trying to purge cache for ${args[0]}}`,
            )
          }
          return originalValue?.apply(target, args)
        }
      }
      return originalValue
    },
  })
}
