import type { Context } from 'https://edge.netlify.com'

import edgeFunction from './bundle.js'
import { buildResponse } from './utils.ts'

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
  url: string
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
    url: url.toString(),
    method: req.method,
    ip: context.ip,
    body: req.body ?? undefined,
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
