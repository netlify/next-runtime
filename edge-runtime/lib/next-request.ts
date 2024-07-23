import type { Context } from '@netlify/edge-functions'

import {
  addBasePath,
  addLocale,
  normalizeDataUrl,
  normalizeLocalePath,
  normalizeTrailingSlash,
  removeBasePath,
} from './util.ts'

import type { NextConfig } from 'next/dist/server/config-shared'
import type { NextRequest, RequestInit } from 'next/dist/server/web/spec-extension/request.js'

export type NetlifyNextRequest = Partial<Omit<NextRequest, 'headers'>> &
  RequestInit & {
    headers: HeadersInit
  }

const normalizeRequest = (url: URL, nextConfig?: NextConfig): URL => {
  url.pathname = removeBasePath(url.pathname, nextConfig?.basePath)

  // We want to run middleware for data requests and expose the URL of the
  // corresponding pages, so we have to normalize the URLs before running
  // the handler.
  url.pathname = normalizeDataUrl(url.pathname)

  // Normalizing the trailing slash based on the `trailingSlash` configuration
  // property from the Next.js config.
  url.pathname = normalizeTrailingSlash(url.pathname, nextConfig?.trailingSlash)

  url.pathname = addBasePath(url.pathname, nextConfig?.basePath)

  return url
}

export const localizeRequest = (
  url: URL,
  nextConfig?: NextConfig,
): { localizedUrl: URL; locale?: string } => {
  url.pathname = removeBasePath(url.pathname, nextConfig?.basePath)

  // Detect the locale from the URL
  const { detectedLocale } = normalizeLocalePath(url.pathname, nextConfig?.i18n?.locales)

  // Add the locale to the URL if not already present
  url.pathname = addLocale(url.pathname, detectedLocale ?? nextConfig?.i18n?.defaultLocale)

  url.pathname = addBasePath(url.pathname, nextConfig?.basePath)

  return {
    localizedUrl: url,
    locale: detectedLocale,
  }
}

export const buildNextRequest = (
  request: Request,
  context: Context,
  nextConfig?: NextConfig,
): NetlifyNextRequest => {
  const { method, body, headers } = request
  const { country, subdivision, city, latitude, longitude } = context.geo
  const { i18n, basePath, trailingSlash } = nextConfig ?? {}

  const url = new URL(request.url)
  const normalizedUrl = nextConfig?.skipMiddlewareUrlNormalize
    ? url
    : normalizeRequest(url, nextConfig)

  return {
    url: normalizedUrl.toString(),
    headers: Object.fromEntries(headers.entries()),
    geo: {
      city,
      country: country?.code,
      region: subdivision?.code,
      latitude: latitude?.toString(),
      longitude: longitude?.toString(),
    },
    ip: context.ip,
    method,
    body,
    nextConfig: {
      i18n,
      basePath,
      trailingSlash,
    },
  }
}
