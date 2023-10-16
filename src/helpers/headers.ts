import type { OutgoingHttpHeaders } from 'http'

import type { HandlerEvent } from '@netlify/functions'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'

export interface NetlifyVaryHeaderBuilder {
  headers: string[]
  languages: string[]
  cookies: string[]
}

const generateNetlifyVaryHeaderValue = ({
  headers,
  languages,
  cookies,
}: NetlifyVaryHeaderBuilder): string => {
  let NetlifyVaryHeader = ``
  if (headers && headers.length !== 0) {
    NetlifyVaryHeader += `header=${headers.join(`|`)}`
  }
  if (languages && languages.length !== 0) {
    if (NetlifyVaryHeader.length !== 0) {
      NetlifyVaryHeader += `,`
    }
    NetlifyVaryHeader += `language=${languages.join(`|`)}`
  }
  if (cookies && cookies.length !== 0) {
    if (NetlifyVaryHeader.length !== 0) {
      NetlifyVaryHeader += `,`
    }
    NetlifyVaryHeader += `cookie=${cookies.join(`|`)}`
  }

  return NetlifyVaryHeader
}

const getDirectives = (headerValue: string): string[] =>
  headerValue.split(',').map((directive) => directive.trim())

const removeSMaxAgeAndSWR = (headerValue: string): string =>
  getDirectives(headerValue)
    .filter((directive) => {
      if (directive.startsWith('s-maxage')) {
        return false
      }
      if (directive.startsWith('stale-while-revalidate')) {
        return false
      }
      return true
    })
    .join(`,`)

export const getVaryHeaders = (
  headers: Record<string, string>,
  event: HandlerEvent,
  nextConfig: NextConfigComplete,
) => {
  const netlifyVaryBuilder: NetlifyVaryHeaderBuilder = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  if (headers.vary.length !== 0) {
    netlifyVaryBuilder.headers.push(...getDirectives(headers.vary))
  }

  const autoDetectedLocales = getAutoDetectedLocales(nextConfig)

  if (autoDetectedLocales.length > 1) {
    const logicalPath =
      nextConfig.basePath && event.path.startsWith(nextConfig.basePath)
        ? event.path.slice(nextConfig.basePath.length)
        : event.path

    if (logicalPath === `/`) {
      netlifyVaryBuilder.languages.push(...autoDetectedLocales)
      netlifyVaryBuilder.cookies.push(`NEXT_LOCALE`)
    }
  }

  const NetlifyVaryHeader = generateNetlifyVaryHeaderValue(netlifyVaryBuilder)
  if (NetlifyVaryHeader.length !== 0) {
    headers[`netlify-vary`] = NetlifyVaryHeader
  }
}

/**
 * Ensure stale-while-revalidate and s-maxage don't leak to the client, but
 * assume the user knows what they are doing if CDN-Cache-Control is set
 */
export const getCacheControlHeaders = (headers: OutgoingHttpHeaders) =>
  headers['cache-control'] && !headers['cdn-cache-control'] && !headers['netlify-cdn-cache-control']
    ? [
        ['netlify-cdn-cache-control', headers['cache-control']],
        [
          'cache-control',
          removeSMaxAgeAndSWR(headers['cache-control']) ?? 'public, max-age=0, must-revalidate',
        ],
      ]
    : []

export const getAutoDetectedLocales = (config: NextConfigComplete): Array<string> => {
  if (config.i18n && config.i18n.localeDetection !== false && config.i18n.locales.length > 1) {
    return config.i18n.locales
  }

  return []
}
