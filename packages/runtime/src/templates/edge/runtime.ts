import type { Context } from 'https://edge.netlify.com'
// Available at build time
import matchers from './matchers.json' assert { type: 'json' }
import nextConfig from '../edge-shared/nextConfig.json' assert { type: 'json' }
import edgeFunction from './bundle.js'
import { buildResponse } from '../edge-shared/utils.ts'
import { getMiddlewareRouteMatcher, MiddlewareRouteMatch, searchParamsToUrlQuery } from '../edge-shared/next-utils.ts'

const matchesMiddleware: MiddlewareRouteMatch = getMiddlewareRouteMatcher(matchers || [])

export interface FetchEventResult {
  response: Response
  waitUntil: Promise<any>
}

export interface RequestData {
  geo?: {
    city?: string
    country?: string
    region?: string
    latitude?: string
    longitude?: string
  }
  headers: Record<string, string>
  ip?: string
  method: string
  nextConfig?: {
    basePath?: string
    i18n?: Record<string, unknown>
    trailingSlash?: boolean
  }
  page?: {
    name?: string
    params?: { [key: string]: string }
  }
  url: URL
  body?: ReadableStream<Uint8Array>
}

export interface RequestContext {
  request: Request
  context: Context
}

declare global {
  // deno-lint-ignore no-var
  var NFRequestContextMap: Map<string, RequestContext>
}

globalThis.NFRequestContextMap ||= new Map()

const handler = async (req: Request, context: Context) => {
  if (Deno.env.get('NETLIFY_DEV')) {
    // Don't run in dev
    return
  }

  const url = new URL(req.url)

  // While we have already checked the path when mapping to the edge function,
  // Next.js supports extra rules that we need to check here too.
  if (!matchesMiddleware(url.pathname, req, searchParamsToUrlQuery(url.searchParams))) {
    return
  }

  const geo = {
    country: context.geo.country?.code,
    region: context.geo.subdivision?.code,
    city: context.geo.city,
  }

  const requestId = req.headers.get('x-nf-request-id')
  if (!requestId) {
    console.error('Missing x-nf-request-id header')
  } else {
    globalThis.NFRequestContextMap.set(requestId, {
      request: req,
      context,
    })
  }

  const request: RequestData = {
    headers: Object.fromEntries(req.headers.entries()),
    geo,
    url,
    method: req.method,
    ip: context.ip,
    body: req.body ?? undefined,
    nextConfig,
  }

  try {
    const result = await edgeFunction({ request })
    return buildResponse({ result, request: req, context })
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
