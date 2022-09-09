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
  middlewareResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
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

export const buildResponse = async ({
  result,
  request,
  context,
}: {
  result: FetchEventResult
  request: Request
  context: Context
}) => {
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
      return new Response(JSON.stringify(transformed), response)
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
