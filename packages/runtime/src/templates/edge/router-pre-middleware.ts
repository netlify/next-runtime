// Available at build time
import routesManifest from '../edge-shared/routes-manifest.json' assert { type: 'json' }
import type { RoutesManifest } from '../edge-shared/next-utils.ts'
import { applyHeaderRules, applyRedirectRules } from '../edge-shared/router.ts'

import { Context } from 'https://edge.netlify.com/'
declare global {
  // deno-lint-ignore no-var
  var NETLIFY_NEXT_EDGE_ROUTER: boolean
}

globalThis.NETLIFY_NEXT_EDGE_ROUTER = true

/**
 * Stage 1 routing
 */

const handler = async (request: Request, context: Context) => {
  const manifest: RoutesManifest = routesManifest as unknown as RoutesManifest

  // Get changed response headers
  const extraHeaders = applyHeaderRules(request, manifest.headers)

  const redirect = applyRedirectRules(request, manifest.redirects)
  let response: Response
  if (redirect) {
    console.log({ redirect })
    response = redirect
  } else if (extraHeaders.length === 0) {
    // No redirect and no new headers, so we can skip to the next function
    return
  } else {
    // No redirect, but there are new headers to apply, so we need to fetch the response
    response = await context.next()
  }

  // Redirect with no extra headers
  if (extraHeaders.length === 0) {
    return response
  }

  // Clone the response, because we need to add headers and reponse headers are immutable
  return new Response(response.body, {
    headers: new Headers([...response.headers.entries(), ...extraHeaders]),
    status: response.status,
    statusText: response.statusText,
  })
}

export default handler
