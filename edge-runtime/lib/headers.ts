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
