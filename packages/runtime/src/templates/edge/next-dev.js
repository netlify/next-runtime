import { NextRequest } from 'https://esm.sh/v91/next@12.2.5/deno/dist/server/web/spec-extension/request.js'
import { NextResponse } from 'https://esm.sh/v91/next@12.2.5/deno/dist/server/web/spec-extension/response.js'
import { fromFileUrl } from 'https://deno.land/std@0.151.0/path/mod.ts'
import { buildResponse } from '../edge-shared/utils.ts'

globalThis.NFRequestContextMap ||= new Map()
globalThis.__dirname = fromFileUrl(new URL('./', import.meta.url)).slice(0, -1)

// Check if a file exists, given a relative path
const exists = async (relativePath) => {
  const path = fromFileUrl(new URL(relativePath, import.meta.url))
  try {
    await Deno.stat(path)
    return true
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false
    }
    throw error
  }
}
let idx = 0

const handler = async (req, context) => {
  if (!Deno.env.get('NETLIFY_DEV')) {
    // Only run in dev
    return
  }

  let middleware
  // Dynamic imports and FS operations aren't allowed when deployed,
  // but that's fine because this is only ever used locally.
  // We don't want to just try importing and use that to test,
  // because that would also throw if there's an error in the middleware,
  // which we would want to surface not ignore.
  if (await exists('../../middleware.js')) {
    // We need to cache-bust the import because otherwise it will claim it
    // doesn't exist if the user creates it after the server starts
    const nextMiddleware = await import(`../../middleware.js#${idx++}`)
    middleware = nextMiddleware.middleware
  } else {
    //  No middleware, so we silently return
    return
  }

  //  This is the format expected by Next.js
  const geo = {
    country: context.geo.country?.code,
    region: context.geo.subdivision?.code,
    city: context.geo.city,
  }

  // A default request id is fine locally
  const requestId = req.headers.get('x-nf-request-id') || 'request-id'

  globalThis.NFRequestContextMap.set(requestId, {
    request: req,
    context,
  })

  const request = {
    headers: Object.fromEntries(req.headers.entries()),
    geo,
    method: req.method,
    ip: context.ip,
    body: req.body || undefined,
  }

  const nextRequest = new NextRequest(req, request)

  try {
    const response = await middleware(nextRequest)
    return buildResponse({
      result: { response: response || NextResponse.next(), waitUntil: Promise.resolve() },
      request: req,
      context,
    })
  } catch (error) {
    console.error(error)
    return new Response(error.message, { status: 500 })
  } finally {
    if (requestId) {
      globalThis.NFRequestContextMap.delete(requestId)
    }
  }
}

export default handler
