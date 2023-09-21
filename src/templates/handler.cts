import http from 'node:http'

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
// @ts-ignore
import { getRequestHandlers } from 'next/dist/server/lib/start-server.js'

// @ts-ignore
import requiredServerFiles from './.next/required-server-files.json'
// @ts-ignore
import { Bridge } from './bridge.js'

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

process.chdir(__dirname)

let bridge: Bridge

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

const handleVary = (eventPath: string, headers: Record<string, string>) => {
  const netlifyVaryBuilder: NetlifyVaryHeaderBuilder = {
    headers: [],
    languages: [],
    cookies: ['__prerender_bypass', '__next_preview_data'],
  }

  if (headers.vary.length !== 0) {
    netlifyVaryBuilder.headers.push(...getDirectives(headers.vary))
  }

  if (
    requiredServerFiles.config.i18n &&
    requiredServerFiles.config.i18n.localeDetection !== false &&
    requiredServerFiles.config.i18n.locales.length > 1
  ) {
    const logicalPath =
      requiredServerFiles.config.basePath && eventPath.startsWith(requiredServerFiles.config.basePath)
        ? eventPath.slice(requiredServerFiles.config.basePath.length)
        : eventPath

    if (logicalPath === `/`) {
      netlifyVaryBuilder.languages.push(...requiredServerFiles.config.i18n.locales)
      netlifyVaryBuilder.cookies.push(`NEXT_LOCALE`)
    }
  }

  const NetlifyVaryHeader = generateNetlifyVaryHeaderValue(netlifyVaryBuilder)
  if (NetlifyVaryHeader.length !== 0) {
    headers[`netlify-vary`] = NetlifyVaryHeader
  }
}

const handleCacheControl = (headers: Record<string, string>) => {
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

export const handler: Handler = async function (event: HandlerEvent, context: HandlerContext) {
  if (!bridge) {
    // let Next.js initialize and create the request handler
    const [nextHandler] = await getRequestHandlers({
      port: 3000,
      hostname: 'localhost',
      dir: __dirname,
      isDev: false,
    })

    // create a standard HTTP server that will receive
    // requests from the bridge and send them to Next.js
    const server = http.createServer(async (req, res) => {
      try {
        console.log('Next server request:', req.url)
        await nextHandler(req, res)
      } catch (error) {
        console.error(error)
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    })

    bridge = new Bridge(server)
    bridge.listen()
  }

  // pass the AWS lambda event and context to the bridge
  const { headers, ...result } = await bridge.launcher(event, context)

  // log the response from Next.js
  const response = { headers, statusCode: result.statusCode }
  console.log('Next server response:', JSON.stringify(response, null, 2))

    handleCacheControl(headers)
  handleVary(event.path, headers)
  console.log(`Response headers after Netlify processing:`, JSON.stringify(headers, null, 2))

  return {
    ...result,
    headers,
    isBase64Encoded: result.encoding === 'base64',
  }
}
