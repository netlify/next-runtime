import type { Context } from 'netlify:edge'
export interface FetchEventResult {
  response: Response
  waitUntil: Promise<any>
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
    res.headers.delete('x-middleware-rewrite')
    return addMiddlewareHeaders(context.rewrite(rewrite), res)
  }
  if (res.headers.get('x-middleware-next') === '1') {
    res.headers.delete('x-middleware-next')
    return addMiddlewareHeaders(context.next(), res)
  }
  return res
}
