import type { Context } from 'netlify:edge'

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

const handler = async (req: Request, context: Context) => {
  const url = new URL(req.url)
  if (url.pathname.startsWith('/_next/static/')) {
    return
  }

  const geo = {
    country: context.geo.country?.code,
    region: context.geo.subdivision?.code,
    city: context.geo.city,
  }

  // The geo object is passed through to the middleware unchanged
  // so we're smuggling the Request and Netlify context object inside it

  Object.defineProperty(geo, '__nf_context', {
    value: context,
    enumerable: false,
  })

  Object.defineProperty(geo, '__nf_request', {
    value: req,
    enumerable: false,
  })

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
  }
}

export default handler
