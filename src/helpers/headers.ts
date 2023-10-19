import type { IncomingMessage, ServerResponse } from 'http'

import type { NextConfigComplete } from 'next/dist/server/config-shared.js'

type HeaderValue = number | string | string[]

interface NetlifyVaryDirectives {
  headers: string[]
  languages: string[]
  cookies: string[]
}

const generateNetlifyVaryDirectives = ({
  headers,
  languages,
  cookies,
}: NetlifyVaryDirectives): string[] => {
  const directives = []
  if (headers.length !== 0) {
    directives.push(`header=${headers.join(`|`)}`)
  }
  if (languages.length !== 0) {
    directives.push(`language=${languages.join(`|`)}`)
  }
  if (cookies.length !== 0) {
    directives.push(`cookie=${cookies.join(`|`)}`)
  }
  return directives
}

/**
 * Parse a header value into an array of directives
 */
const getDirectives = (headerValue: HeaderValue): string[] => {
  const directives = Array.isArray(headerValue) ? headerValue : String(headerValue).split(',')
  return directives.map((directive) => directive.trim())
}
/**
 * Ensure the Netlify CDN varies on things that Next.js varies on,
 * e.g. i18n, preview mode, etc.
 */
export const setVaryHeaders = (
  res: ServerResponse,
  req: IncomingMessage,
  { basePath, i18n }: NextConfigComplete,
) => {
  const netlifyVaryDirectives: NetlifyVaryDirectives = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  const vary = res.getHeader('vary')
  if (vary !== undefined) {
    netlifyVaryDirectives.headers.push(...getDirectives(vary))
  }

  const path = new URL(req.url ?? '/', `http://${req.headers.host}`).pathname
  const locales = i18n && i18n.localeDetection !== false ? i18n.locales : []

  if (locales.length > 1) {
    const logicalPath = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path
    if (logicalPath === `/`) {
      netlifyVaryDirectives.languages.push(...locales)
      netlifyVaryDirectives.cookies.push(`NEXT_LOCALE`)
    }
  }

  res.setHeader(`netlify-vary`, generateNetlifyVaryDirectives(netlifyVaryDirectives))
}

/**
 * Ensure stale-while-revalidate and s-maxage don't leak to the client, but
 * assume the user knows what they are doing if CDN cache controls are set
 */
export const setCacheControlHeaders = (res: ServerResponse) => {
  const cacheControl = res.getHeader('cache-control')
  if (
    cacheControl !== undefined &&
    !res.hasHeader('cdn-cache-control') &&
    !res.hasHeader('netlify-cdn-cache-control')
  ) {
    const directives = getDirectives(cacheControl).filter(
      (directive) =>
        !directive.startsWith('s-maxage') && !directive.startsWith('stale-while-revalidate'),
    )

    res.setHeader('netlify-cdn-cache-control', cacheControl)
    res.setHeader(
      'cache-control',
      directives.length === 0 ? 'public, max-age=0, must-revalidate' : directives,
    )
  }
}
