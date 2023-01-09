import type { Context } from 'https://edge.netlify.com'
import { ElementHandlers, HTMLRewriter } from 'https://deno.land/x/html_rewriter@v0.1.0-pre.17/index.ts'

export interface FetchEventResult {
  response: Response
  waitUntil: Promise<any>
}

type NextDataTransform = <T>(data: T) => T

/**
 * This is how Next handles rewritten URLs.
 */
export function relativizeURL(url: string | string, base: string | URL) {
  const baseURL = typeof base === 'string' ? new URL(base) : base
  const relative = new URL(url, base)
  const origin = `${baseURL.protocol}//${baseURL.host}`
  return `${relative.protocol}//${relative.host}` === origin
    ? relative.toString().replace(origin, '')
    : relative.toString()
}

export const addMiddlewareHeaders = async (
  originResponse: Promise<Response> | Response,
  middlewareResponse: Response,
) => {
  // If there are extra headers, we need to add them to the response.
  if ([...middlewareResponse.headers.keys()].length === 0) {
    return originResponse
  }
  // We need to await the response to get the origin headers, then we can add the ones from middleware.
  const res = await originResponse
  const response = new Response(res.body, res)
  const originCookies = response.headers.get('set-cookie')
  middlewareResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
    // Append origin cookies after middleware cookies
    if (key === 'set-cookie' && originCookies) {
      response.headers.append(key, originCookies)
    }
  })
  return response
}

interface MiddlewareResponse extends Response {
  originResponse: Response
  dataTransforms: NextDataTransform[]
  elementHandlers: Array<[selector: string, handlers: ElementHandlers]>
}

interface MiddlewareRequest {
  request: Request
  context: Context
  originalRequest: Request
  next(): Promise<MiddlewareResponse>
  rewrite(destination: string | URL, init?: ResponseInit): Response
}

function isMiddlewareRequest(response: Response | MiddlewareRequest): response is MiddlewareRequest {
  return 'originalRequest' in response
}

function isMiddlewareResponse(response: Response | MiddlewareResponse): response is MiddlewareResponse {
  return 'dataTransforms' in response
}

// Next 13 supports request header mutations and has the side effect of prepending header values with 'x-middleware-request'
// as part of invoking NextResponse.next() in the middleware. We need to remove that before sending the response the user
// as the code that removes it in Next isn't run based on how we handle the middleware
//
// Related Next.js code:
// * https://github.com/vercel/next.js/blob/68d06fe015b28d8f81da52ca107a5f4bd72ab37c/packages/next/server/next-server.ts#L1918-L1928
// * https://github.com/vercel/next.js/blob/43c9d8940dc42337dd2f7d66aa90e6abf952278e/packages/next/server/web/spec-extension/response.ts#L10-L27
export function updateModifiedHeaders(requestHeaders: Headers, responseHeaders: Headers) {
  const overriddenHeaders = responseHeaders.get('x-middleware-override-headers')

  if (!overriddenHeaders) {
    return
  }

  const headersToUpdate = overriddenHeaders.split(',').map((header) => header.trim())

  for (const header of headersToUpdate) {
    const oldHeaderKey = 'x-middleware-request-' + header
    const headerValue = responseHeaders.get(oldHeaderKey) || ''

    requestHeaders.set(header, headerValue)
    responseHeaders.delete(oldHeaderKey)
  }
  responseHeaders.delete('x-middleware-override-headers')
}

export const buildResponse = async ({
  result,
  request,
  context,
}: {
  result: FetchEventResult
  request: Request
  context: Context
}) => {
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
    // If it's JSON we don't need to use the rewriter, we can just parse it
    if (response.originResponse.headers.get('content-type')?.includes('application/json')) {
      const props = await response.originResponse.json()
      const transformed = response.dataTransforms.reduce((prev, transform) => {
        return transform(prev)
      }, props)
      const body = JSON.stringify(transformed)
      const headers = new Headers(response.headers)
      headers.set('content-length', String(body.length))
      return new Response(body, { ...response, headers })
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
              const props = response.dataTransforms.reduce((prev, transform) => transform(prev), data.props)
              // Replace the data with the transformed props
              textChunk.replace(JSON.stringify({ ...data, props }))
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
  const isDataReq = request.headers.get('x-nextjs-data')

  if (rewrite) {
    const rewriteUrl = new URL(rewrite, request.url)
    const baseUrl = new URL(request.url)
    const relativeUrl = relativizeURL(rewrite, request.url)

    // Data requests might be rewritten to an external URL
    // This header tells the client router the redirect target, and if it's external then it will do a full navigation
    if (isDataReq) {
      res.headers.set('x-nextjs-rewrite', relativeUrl)
    }
    if (rewriteUrl.hostname !== baseUrl.hostname) {
      // Netlify Edge Functions don't support proxying to external domains, but Next middleware does
      const proxied = fetch(new Request(rewriteUrl.toString(), request))
      return addMiddlewareHeaders(proxied, res)
    }
    res.headers.set('x-middleware-rewrite', relativeUrl)

    return addMiddlewareHeaders(context.rewrite(rewrite), res)
  }

  const redirect = res.headers.get('Location')

  // Data requests shouldn;t automatically redirect in the browser (they might be HTML pages): they're handled by the router
  if (redirect && isDataReq) {
    res.headers.delete('location')
    res.headers.set('x-nextjs-redirect', relativizeURL(redirect, request.url))
  }

  if (res.headers.get('x-middleware-next') === '1') {
    return addMiddlewareHeaders(context.next(), res)
  }
  return res
}
