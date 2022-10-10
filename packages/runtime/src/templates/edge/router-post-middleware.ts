import type { Context } from 'https://edge.netlify.com'
// Available at build time
import routesManifest from '../edge-shared/routes-manifest.json' assert { type: 'json' }
import staticRoutes from '../edge-shared/public-manifest.json' assert { type: 'json' }
import { runPostMiddleware } from '../edge-shared/router.ts'
import type { RoutesManifest } from '../edge-shared/next-utils.ts'

/**
 * Stage 2 routing
 */

// deno-lint-ignore require-await
const handler = async (request: Request, context: Context) => {
  const rewrite = request.headers.get('x-middleware-rewrite')
  const result = runPostMiddleware(
    rewrite ? new Request(rewrite, request) : request,
    routesManifest as unknown as RoutesManifest,
    new Set(staticRoutes),
  )
  if (result instanceof Response) {
    return result
  }
  for (const header of result.headers.entries()) {
    request.headers.set(...header)
  }
  if (result.url === request.url) {
    return
  }
  const resultUrl = new URL(result.url)
  const requestUrl = new URL(request.url)

  // External rewrite
  if (resultUrl.hostname !== 'n' && resultUrl.hostname !== requestUrl.hostname) {
    return fetch(result, { redirect: 'manual' })
  }

  return context.rewrite(result.url)
}
export default handler
