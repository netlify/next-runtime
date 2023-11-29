import { purgeCache } from '@netlify/functions'
import type { ServerResponse } from 'node:http'

// Needing to proxy the response object to intercept the revalidate call for on-demand revalidation on page routes
export const nextResponseProxy = (res: ServerResponse) => {
  return new Proxy(res, {
    get(target: any[string], key: string) {
      const originalValue = target[key]
      if (key === 'revalidate') {
        return async function newRevalidate(...args: any[]) {
          try {
            console.debug('Purging cache for:', [args[0]])
            await purgeCache({ tags: [`_N_T_${args[0]}`] })
          } catch (err) {
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
