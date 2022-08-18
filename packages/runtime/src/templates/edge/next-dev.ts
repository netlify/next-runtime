import type { Context } from 'https://edge.netlify.com'
import { NextRequest, NextResponse } from 'https://esm.sh/next/server'
import { fromFileUrl } from 'https://deno.land/std/path/mod.ts'
import { buildResponse } from './utils.ts'

export interface FetchEventResult {
  response: Response
  waitUntil: Promise<unknown>
}

interface I18NConfig {
  defaultLocale: string
  domains?: DomainLocale[]
  localeDetection?: false
  locales: string[]
}

interface DomainLocale {
  defaultLocale: string
  domain: string
  http?: true
  locales?: string[]
}
export interface NextRequestInit extends RequestInit {
  geo?: {
    city?: string
    country?: string
    region?: string
  }
  ip?: string
  nextConfig?: {
    basePath?: string
    i18n?: I18NConfig | null
    trailingSlash?: boolean
  }
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
  // deno-lint-ignore no-var
  var __dirname: string
}

globalThis.NFRequestContextMap ||= new Map()
globalThis.__dirname = fromFileUrl(new URL('./', import.meta.url)).slice(0, -1)

// Check if a file exists, given a relative path
const exists = async (relativePath: string) => {
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

const handler = async (req: Request, context: Context) => {
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
    // These will be user code
    const nextMiddleware = await import('../../middleware.js')
    middleware = nextMiddleware.middleware
  } else {
    //  No middleware, so we silently return
    return
  }

  //  This is the format expected by Next.js
  const geo: NextRequestInit['geo'] = {
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

  const request: NextRequestInit = {
    headers: Object.fromEntries(req.headers.entries()),
    geo,
    method: req.method,
    ip: context.ip,
    body: req.body || undefined,
  }

  const nextRequest: NextRequest = new NextRequest(req, request)

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
