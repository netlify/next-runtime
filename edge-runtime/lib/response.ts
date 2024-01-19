import type { Context } from '@netlify/edge-functions'
import { HTMLRewriter } from '../vendor/deno.land/x/html_rewriter@v0.1.0-pre.17/index.ts'

import { updateModifiedHeaders } from './headers.ts'
import type { StructuredLogger } from './logging.ts'
import { normalizeDataUrl, relativizeURL, rewriteDataPath } from './util.ts'
import { addMiddlewareHeaders, isMiddlewareRequest, isMiddlewareResponse } from './middleware.ts'
import { RequestData } from './next-request.ts'

export interface FetchEventResult {
  response: Response
  waitUntil: Promise<any>
}

interface BuildResponseOptions {
  context: Context
  logger: StructuredLogger
  request: Request
  result: FetchEventResult
  nextConfig?: RequestData['nextConfig']
}

export const buildResponse = async ({
  context,
  logger,
  request,
  result,
  nextConfig,
}: BuildResponseOptions) => {
  logger
    .withFields({ is_nextresponse_next: result.response.headers.has('x-middleware-next') })
    .debug('Building Next.js response')

  updateModifiedHeaders(request.headers, result.response.headers)

  // They've returned the MiddlewareRequest directly, so we'll call `next()` for them.
  if (isMiddlewareRequest(result.response)) {
    result.response = await result.response.next()
  }

  if (isMiddlewareResponse(result.response)) {
    const { response } = result
    if (request.method === 'HEAD' || request.method === 'OPTIONS') {
      return response.originResponse
    }

    // NextResponse doesn't set cookies onto the originResponse, so we need to copy them over
    // In some cases, it's possible there are no headers set. See https://github.com/netlify/pod-ecosystem-frameworks/issues/475
    if (response.cookies._headers?.has('set-cookie')) {
      response.originResponse.headers.set(
        'set-cookie',
        response.cookies._headers.get('set-cookie')!,
      )
    }

    // If it's JSON we don't need to use the rewriter, we can just parse it
    if (response.originResponse.headers.get('content-type')?.includes('application/json')) {
      const props = await response.originResponse.json()
      const transformed = response.dataTransforms.reduce((prev, transform) => {
        return transform(prev)
      }, props)
      const body = JSON.stringify(transformed)
      const headers = new Headers(response.headers)
      headers.set('content-length', String(body.length))

      return Response.json(transformed, { ...response, headers })
    }

    // This var will hold the contents of the script tag
    let buffer = ''
    // Create an HTMLRewriter that matches the Next data script tag
    const rewriter = new HTMLRewriter()

    if (response.dataTransforms.length > 0) {
      rewriter.on('script[id="__NEXT_DATA__"]', {
        text(textChunk) {
          // Grab all the chunks in the Next data script tag
          buffer += textChunk.text
          if (textChunk.lastInTextNode) {
            try {
              // When we have all the data, try to parse it as JSON
              const data = JSON.parse(buffer.trim())
              // Apply all of the transforms to the props
              const props = response.dataTransforms.reduce(
                (prev, transform) => transform(prev),
                data.props,
              )
              // Replace the data with the transformed props
              // With `html: true` the input is treated as raw HTML
              // @see https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/#global-types
              textChunk.replace(JSON.stringify({ ...data, props }), { html: true })
            } catch (err) {
              console.log('Could not parse', err)
            }
          } else {
            // Remove the chunk after we've appended it to the buffer
            textChunk.remove()
          }
        },
      })
    }

    if (response.elementHandlers.length > 0) {
      response.elementHandlers.forEach(([selector, handlers]) => rewriter.on(selector, handlers))
    }
    return rewriter.transform(response.originResponse)
  }
  const res = new Response(result.response.body, result.response)
  request.headers.set('x-nf-next-middleware', 'skip')

  const rewrite = res.headers.get('x-middleware-rewrite')

  // Data requests (i.e. requests for /_next/data ) need special handling
  const isDataReq = request.headers.has('x-nextjs-data')

  if (rewrite) {
    logger.withFields({ rewrite_url: rewrite }).debug('Found middleware rewrite')

    const rewriteUrl = new URL(rewrite, request.url)
    const baseUrl = new URL(request.url)
    const relativeUrl = relativizeURL(rewrite, request.url)
    const originalPath = new URL(request.url, `http://n`).pathname

    // Data requests might be rewritten to an external URL
    // This header tells the client router the redirect target, and if it's external then it will do a full navigation
    if (isDataReq) {
      res.headers.set('x-nextjs-rewrite', relativeUrl)
      rewriteUrl.pathname = rewriteDataPath({
        dataUrl: originalPath,
        newRoute: relativeUrl,
        basePath: nextConfig?.basePath,
      })
    }
    if (rewriteUrl.origin !== baseUrl.origin) {
      // Netlify Edge Functions don't support proxying to external domains, but Next middleware does
      const proxied = fetch(new Request(rewriteUrl, request))
      return addMiddlewareHeaders(proxied, res)
    }
    res.headers.set('x-middleware-rewrite', relativeUrl)
    request.headers.set('x-middleware-rewrite', rewrite)

    return addMiddlewareHeaders(fetch(new Request(rewriteUrl, request)), res)
  }

  const redirect = res.headers.get('Location')

  // Data requests shouldn't automatically redirect in the browser (they might be HTML pages): they're handled by the router
  if (redirect && isDataReq) {
    res.headers.delete('location')
    res.headers.set('x-nextjs-redirect', relativizeURL(redirect, request.url))
  }

  const nextRedirect = res.headers.get('x-nextjs-redirect')

  if (nextRedirect && isDataReq) {
    res.headers.set('x-nextjs-redirect', normalizeDataUrl(nextRedirect))
  }

  if (res.headers.get('x-middleware-next') === '1') {
    res.headers.delete('x-middleware-next')
    return addMiddlewareHeaders(context.next(), res)
  }

  return res
}
