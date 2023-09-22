import type { NextConfigComplete } from 'next/dist/server/config-shared'

export interface NetlifyVaryHeaderBuilder {
  headers: string[]
  languages: string[]
  cookies: string[]
}

const generateNetlifyVaryHeaderValue = ({ headers, languages, cookies }: NetlifyVaryHeaderBuilder): string => {
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

const getDirectives = (headerValue: string): string[] => headerValue.split(',').map((directive) => directive.trim())

const removeSMaxAgeAndStaleWhileRevalidate = (headerValue: string): string =>
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

export const handleVary = (
  headers: Record<string, string>,
  eventPath: string,
  basePath: string,
  autoDetectedLocales: string[],
) => {
  const netlifyVaryBuilder: NetlifyVaryHeaderBuilder = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  if (headers.vary.length !== 0) {
    netlifyVaryBuilder.headers.push(...getDirectives(headers.vary))
  }

  if (autoDetectedLocales.length > 1) {
    const logicalPath = basePath && eventPath.startsWith(basePath) ? eventPath.slice(basePath.length) : eventPath

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

export const handleCacheControl = (headers: Record<string, string>) => {
  if (headers['cache-control'] && !headers['cdn-cache-control'] && !headers['netlify-cdn-cache-control']) {
    headers['netlify-cdn-cache-control'] = headers['cache-control']

    const filteredCacheControlDirectives = removeSMaxAgeAndStaleWhileRevalidate(headers['cache-control'])

    // use default cache-control if no directives are left
    headers['cache-control'] =
      filteredCacheControlDirectives.length === 0
        ? 'public, max-age=0, must-revalidate'
        : filteredCacheControlDirectives
  }
}

export const getAutoDetectedLocales = (config: NextConfigComplete): Array<string> => {
  if (config.i18n && config.i18n.localeDetection !== false && config.i18n.locales.length > 1) {
    return config.i18n.locales
  }

  return []
}
