import type { Context } from 'netlify:edge'

export interface FetchEventResult {
  response: Response
  waitUntil: Promise<any>
}

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
  const response = await originResponse
  middlewareResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
  })
  return response
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
  const res = new Response(result.response.body, result.response)
  request.headers.set('x-nf-next-middleware', 'skip')
  const rewrite = res.headers.get('x-middleware-rewrite')
  if (rewrite) {
    res.headers.set('x-middleware-rewrite', relativizeURL(rewrite, request.url))
    return addMiddlewareHeaders(context.rewrite(rewrite), res)
  }
  if (res.headers.get('x-middleware-next') === '1') {
    return addMiddlewareHeaders(context.next(), res)
  }
  return res
}
