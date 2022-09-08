// Available at build time
import routesManifest from '../edge-shared/routes-manifest.json' assert { type: 'json' }
import { runPreMiddleware } from '../edge-shared/router.ts'
import type { RoutesManifest } from '../edge-shared/next-utils.ts'

declare global {
  // deno-lint-ignore no-var
  var NETLIFY_NEXT_EDGE_ROUTER: boolean
}

globalThis.NETLIFY_NEXT_EDGE_ROUTER = true

/**
 * Stage 1 routing
 */

// deno-lint-ignore require-await
const handler = async (request: Request) => {
  const result = runPreMiddleware(request, routesManifest as unknown as RoutesManifest)
  if (result instanceof Response) {
    return result
  }
  // The result may have new headers, so apply these to the request
  for (const header of result.headers.entries()) {
    request.headers.set(...header)
  }
}

export default handler
