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
import type { NextRequest } from 'next/server'

export type NetlifyNextRequest = Pick<
  NextRequest,
  'url' | 'headers' | 'geo' | 'ip' | 'method' | 'body'
>

export type NetlifyNextContext = {
  localizedUrl: string
  detectedLocale?: string
  i18n?: NextConfig['i18n']
  basePath?: NextConfig['basePath']
  trailingSlash?: NextConfig['trailingSlash']
}

const normalizeRequestURL = (originalURL: string, nextConfig?: NextConfig): string => {
  const url = new URL(originalURL)

  url.pathname = removeBasePath(url.pathname, nextConfig?.basePath)

  // We want to run middleware for data requests and expose the URL of the
  // corresponding pages, so we have to normalize the URLs before running
  // the handler.
  url.pathname = normalizeDataUrl(url.pathname)

  // Normalizing the trailing slash based on the `trailingSlash` configuration
  // property from the Next.js config.
  url.pathname = normalizeTrailingSlash(url.pathname, nextConfig?.trailingSlash)

  url.pathname = addBasePath(url.pathname, nextConfig?.basePath)

  return url.toString()
}

const localizeRequestURL = (
  originalURL: string,
  nextConfig?: NextConfig,
): { localizedUrl: string; detectedLocale?: string } => {
  const url = new URL(originalURL)

  url.pathname = removeBasePath(url.pathname, nextConfig?.basePath)

  // Detect the locale from the URL
  const { detectedLocale } = normalizeLocalePath(url.pathname, nextConfig?.i18n?.locales)

  // Add the locale to the URL if not already present
  url.pathname = addLocale(url.pathname, detectedLocale ?? nextConfig?.i18n?.defaultLocale)

  url.pathname = addBasePath(url.pathname, nextConfig?.basePath)

  return {
    localizedUrl: url.toString(),
    detectedLocale,
  }
}

export const buildNextRequest = (
  request: Request,
  context: Context,
  nextConfig?: NextConfig,
): { nextRequest: NetlifyNextRequest; nextContext: NetlifyNextContext } => {
  const { url, method, body, headers } = request
  const { country, subdivision, city, latitude, longitude } = context.geo
  const { i18n, basePath, trailingSlash } = nextConfig ?? {}

  const normalizedUrl = nextConfig?.skipMiddlewareUrlNormalize
    ? url
    : normalizeRequestURL(url, nextConfig)

  const { localizedUrl, detectedLocale } = localizeRequestURL(normalizedUrl, nextConfig)

  const nextRequest: NetlifyNextRequest = {
    url: normalizedUrl,
    headers,
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
  }

  const nextContext = {
    localizedUrl,
    detectedLocale,
    i18n,
    trailingSlash,
    basePath,
  }

  return {
    nextRequest,
    nextContext,
  }
}
