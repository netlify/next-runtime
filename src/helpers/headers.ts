import type { OutgoingHttpHeaders } from 'http'

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
  headers: OutgoingHttpHeaders,
  url: string | undefined,
  basePath: NextConfigComplete['basePath'],
  i18n: NextConfigComplete['i18n'],
) => {
  const netlifyVaryBuilder: NetlifyVaryHeaderBuilder = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  if (headers.vary) {
    netlifyVaryBuilder.headers.push(...getDirectives(headers.vary))
  }

  const path = new URL(url ?? '/').pathname
  const locales = i18n && i18n.localeDetection !== false ? i18n.locales : []

  if (locales.length > 1) {
    const logicalPath = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path

    if (logicalPath === `/`) {
      netlifyVaryBuilder.languages.push(...locales)
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
