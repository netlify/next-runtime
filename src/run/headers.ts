import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { TagsManifest } from './config.js'

interface NetlifyVaryValues {
  headers: string[]
  languages: string[]
  cookies: string[]
}

const generateNetlifyVaryValues = ({ headers, languages, cookies }: NetlifyVaryValues): string => {
  const values: string[] = []
  if (headers.length !== 0) {
    values.push(`header=${headers.join(`|`)}`)
  }
  if (languages.length !== 0) {
    values.push(`language=${languages.join(`|`)}`)
  }
  if (cookies.length !== 0) {
    values.push(`cookie=${cookies.join(`|`)}`)
  }
  return values.join(',')
}

const getHeaderValueArray = (header: string): string[] => {
  return header.split(',').map((value) => value.trim())
}

const removeHeaderValues = (header: string, values: string[]): string => {
  const headerValues = getHeaderValueArray(header)
  const filteredValues = headerValues.filter(
    (value) => !values.some((val) => value.startsWith(val)),
  )
  return filteredValues.join(', ')
}

/**
 * Ensure the Netlify CDN varies on things that Next.js varies on,
 * e.g. i18n, preview mode, etc.
 */
export const setVaryHeaders = (
  headers: Headers,
  request: Request,
  { basePath, i18n }: Pick<NextConfigComplete, 'basePath' | 'i18n'>,
) => {
  const netlifyVaryValues: NetlifyVaryValues = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  const vary = headers.get('vary')
  if (vary !== null) {
    netlifyVaryValues.headers.push(...getHeaderValueArray(vary))
  }

  const path = new URL(request.url).pathname
  const locales = i18n && i18n.localeDetection !== false ? i18n.locales : []

  if (locales.length > 1 && (path === '/' || path === basePath)) {
    netlifyVaryValues.languages.push(...locales)
    netlifyVaryValues.cookies.push(`NEXT_LOCALE`)
  }

  headers.set(`netlify-vary`, generateNetlifyVaryValues(netlifyVaryValues))
}

/**
 * Ensure stale-while-revalidate and s-maxage don't leak to the client, but
 * assume the user knows what they are doing if CDN cache controls are set
 */
export const setCacheControlHeaders = (headers: Headers) => {
  const cacheControl = headers.get('cache-control')
  if (
    cacheControl !== null &&
    !headers.has('cdn-cache-control') &&
    !headers.has('netlify-cdn-cache-control')
  ) {
    const clientCacheControl = removeHeaderValues(cacheControl, [
      's-maxage',
      'stale-while-revalidate',
    ])
    headers.set('cache-control', clientCacheControl || 'public, max-age=0, must-revalidate')
    headers.set('netlify-cdn-cache-control', cacheControl)
  }
}

export const setCacheTagsHeaders = (headers: Headers, request: Request, manifest: TagsManifest) => {
  const path = new URL(request.url).pathname
  const tags = manifest[path]
  headers.set('cache-tag', tags)
}
