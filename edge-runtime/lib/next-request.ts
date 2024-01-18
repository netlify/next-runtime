import type { Context } from '@netlify/edge-functions'

import { normalizeDataUrl } from './util.ts'

interface I18NConfig {
  defaultLocale: string
  localeDetection?: false
  locales: string[]
}

export interface RequestData {
  geo?: {
    city?: string
    country?: string
    region?: string
    latitude?: string
    longitude?: string
    timezone?: string
  }
  headers: Record<string, string>
  ip?: string
  method: string
  nextConfig?: {
    basePath?: string
    i18n?: I18NConfig | null
    trailingSlash?: boolean
  }
  page?: {
    name?: string
    params?: { [key: string]: string }
  }
  url: string
  body?: ReadableStream<Uint8Array>
}

const normalizeRequestURL = (originalURL: string, enforceTrailingSlash: boolean) => {
  const url = new URL(originalURL)

  // We want to run middleware for data requests and expose the URL of the
  // corresponding pages, so we have to normalize the URLs before running
  // the handler.
  url.pathname = normalizeDataUrl(url.pathname)

  // Normalizing the trailing slash based on the `trailingSlash` configuration
  // property from the Next.js config.
  if (enforceTrailingSlash && url.pathname !== '/' && !url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`
  }

  return url.toString()
}

export const buildNextRequest = (
  request: Request,
  context: Context,
  nextConfig?: RequestData['nextConfig'],
): RequestData => {
  const { url, method, body, headers } = request
  const { country, subdivision, city, latitude, longitude, timezone } = context.geo
  const geo: RequestData['geo'] = {
    country: country?.code,
    region: subdivision?.code,
    city,
    latitude: latitude?.toString(),
    longitude: longitude?.toString(),
    timezone,
  }

  return {
    headers: Object.fromEntries(headers.entries()),
    geo,
    url: normalizeRequestURL(url, Boolean(nextConfig?.trailingSlash)),
    method,
    ip: context.ip,
    body: body ?? undefined,
    nextConfig,
  }
}
