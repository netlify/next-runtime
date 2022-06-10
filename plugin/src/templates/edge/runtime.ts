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

  const request: RequestData = {
    headers: Object.fromEntries(req.headers.entries()),
    geo: {
      country: context.geo.country?.code,
      region: context.geo.subdivision?.code,
      city: context.geo.city,
    },
    url: url.toString(),
    method: req.method,
    ip: req.headers.get('x-nf-client-address') ?? undefined,
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
