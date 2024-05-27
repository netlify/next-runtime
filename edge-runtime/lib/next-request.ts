import type { Context } from '@netlify/edge-functions'

import { addBasePath, normalizeDataUrl, normalizeLocalePath, removeBasePath } from './util.ts'

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
    skipMiddlewareUrlNormalize?: boolean
  }
  page?: {
    name?: string
    params?: { [key: string]: string }
  }
  url: string
  body?: ReadableStream<Uint8Array>
  detectedLocale?: string
}

const normalizeRequestURL = (
  originalURL: string,
  nextConfig?: RequestData['nextConfig'],
): { url: string; detectedLocale?: string } => {
  const url = new URL(originalURL)

  url.pathname = removeBasePath(url.pathname, nextConfig?.basePath)
  const didRemoveBasePath = url.toString() !== originalURL

  let detectedLocale: string | undefined

  if (nextConfig?.i18n) {
    const { pathname, detectedLocale: detected } = normalizeLocalePath(
      url.pathname,
      nextConfig?.i18n?.locales,
    )
    if (!nextConfig?.skipMiddlewareUrlNormalize) {
      url.pathname = pathname || '/'
    }
    detectedLocale = detected
  }

  if (!nextConfig?.skipMiddlewareUrlNormalize) {
    // We want to run middleware for data requests and expose the URL of the
    // corresponding pages, so we have to normalize the URLs before running
    // the handler.
    url.pathname = normalizeDataUrl(url.pathname)

    // Normalizing the trailing slash based on the `trailingSlash` configuration
    // property from the Next.js config.
    if (nextConfig?.trailingSlash && url.pathname !== '/' && !url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname}/`
    }
  }

  if (didRemoveBasePath) {
    url.pathname = addBasePath(url.pathname, nextConfig?.basePath)
  }

  // keep the locale in the url for request.nextUrl object
  if (detectedLocale) {
    url.pathname = `/${detectedLocale}${url.pathname}`
  }

  return {
    url: url.toString(),
    detectedLocale,
  }
}

export const buildNextRequest = (
  request: Request,
  context: Context,
  nextConfig?: RequestData['nextConfig'],
): RequestData => {
  const { url, method, body, headers } = request
  const { country, subdivision, city, latitude, longitude, timezone } = context.geo
  const geo: RequestData['geo'] = {
    city,
    country: country?.code,
    region: subdivision?.code,
    latitude: latitude?.toString(),
    longitude: longitude?.toString(),
    timezone,
  }

  const { detectedLocale, url: normalizedUrl } = normalizeRequestURL(url, nextConfig)

  return {
    headers: Object.fromEntries(headers.entries()),
    geo,
    url: normalizedUrl,
    method,
    ip: context.ip,
    body: body ?? undefined,
    nextConfig,
    detectedLocale,
  }
}
