import { HandlerContext, HandlerEvent } from '@netlify/functions'
import type { Bridge as NodeBridge } from '@vercel/node-bridge/bridge'
// Aliasing like this means the editor may be able to syntax-highlight the string
import { outdent as javascript } from 'outdent'

import type { NextConfig } from '../helpers/config'
import { getNextServerModulePath } from '../helpers/files'

import { NextServerType } from './handlerUtils'
import type { NetlifyNextServerType } from './server'

/* eslint-disable @typescript-eslint/no-var-requires */
const { promises } = require('fs')
const { Server } = require('http')
const path = require('path')
// eslint-disable-next-line n/prefer-global/url, n/prefer-global/url-search-params
const { URLSearchParams, URL } = require('url')

const { Bridge } = require('@vercel/node-bridge/bridge')

const {
  augmentFsModule,
  getMaxAge,
  getMultiValueHeaders,
  getPrefetchResponse,
  normalizePath,
} = require('./handlerUtils')
const { getNetlifyNextServer } = require('./server')
/* eslint-enable @typescript-eslint/no-var-requires */

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

// We return a function and then call `toString()` on it to serialise it as the launcher function
// eslint-disable-next-line max-lines-per-function
const makeHandler = (
  conf: NextConfig,
  app: string,
  pageRoot,
  NextServer: NextServerType,
  staticManifest: Array<[string, string]> = [],
  mode = 'ssr',
  // eslint-disable-next-line max-params
) => {
  // Change working directory into the site root, unless using Nx, which moves the
  // dist directory and handles this itself
  const dir = path.resolve(__dirname, app)
  if (pageRoot.startsWith(dir)) {
    process.chdir(dir)
  }

  // This is just so nft knows about the page entrypoints. It's not actually used
  try {
    // eslint-disable-next-line n/no-missing-require
    require.resolve('./pages.js')
  } catch {}

  const NetlifyNextServer: NetlifyNextServerType = getNetlifyNextServer(NextServer)

  const ONE_YEAR_IN_SECONDS = 31536000

  // React assumes you want development mode if NODE_ENV is unset.
  ;(process.env as Mutable<NodeJS.ProcessEnv>).NODE_ENV ||= 'production'

  // We don't want to write ISR files to disk in the lambda environment
  conf.experimental.isrFlushToDisk = false
  // This is our flag that we use when patching the source
  // eslint-disable-next-line no-underscore-dangle
  process.env._REVALIDATE_SSG = 'true'
  for (const [key, value] of Object.entries(conf.env)) {
    process.env[key] = String(value)
  }
  // Set during the request as it needs to get it from the request URL. Defaults to the URL env var
  let base = process.env.URL

  augmentFsModule({ promises, staticManifest, pageRoot, getBase: () => base })

  // We memoize this because it can be shared between requests, but don't instantiate it until
  // the first request because we need the host and port.
  let bridge: NodeBridge
  const getBridge = (event: HandlerEvent, context: HandlerContext): NodeBridge => {
    const {
      clientContext: { custom: customContext },
    } = context

    if (bridge) {
      return bridge
    }
    const url = new URL(event.rawUrl)
    const port = Number.parseInt(url.port) || 80
    base = url.origin

    const nextServer = new NetlifyNextServer(
      {
        conf,
        dir,
        customServer: false,
        hostname: url.hostname,
        port,
      },
      {
        revalidateToken: customContext?.odb_refresh_hooks,
      },
    )
    const requestHandler = nextServer.getRequestHandler()
    const server = new Server(async (req, res) => {
      try {
        await requestHandler(req, res)
      } catch (error) {
        console.error(error)
        throw new Error('Error handling request. See function logs for details.')
      }
    })
    bridge = new Bridge(server)
    bridge.listen()
    return bridge
  }

  return async function handler(event: HandlerEvent, context: HandlerContext) {
    let requestMode = mode
    const prefetchResponse = getPrefetchResponse(event, mode)
    if (prefetchResponse) {
      return prefetchResponse
    }

    event.path = normalizePath(event)

    // Next expects to be able to parse the query from the URL
    const query = new URLSearchParams(event.queryStringParameters).toString()
    event.path = query ? `${event.path}?${query}` : event.path

    const graphToken = event.netlifyGraphToken
    if (graphToken && requestMode !== 'ssr') {
      // Prefix with underscore to help us determine the origin of the token
      // allows us to write better error messages
      // eslint-disable-next-line no-underscore-dangle
      process.env._NETLIFY_GRAPH_TOKEN = graphToken
    }

    const { headers, ...result } = await getBridge(event, context).launcher(event, context)

    // Convert all headers to multiValueHeaders

    const multiValueHeaders = getMultiValueHeaders(headers)

    if (event.headers['x-next-debug-logging']) {
      const response = {
        headers: multiValueHeaders,
        statusCode: result.statusCode,
      }
      console.log('Next server response:', JSON.stringify(response, null, 2))
    }

    if (multiValueHeaders['set-cookie']?.[0]?.includes('__prerender_bypass')) {
      delete multiValueHeaders.etag
      multiValueHeaders['cache-control'] = ['no-cache']
    }

    // Sending SWR headers causes undefined behaviour with the Netlify CDN
    const cacheHeader = multiValueHeaders['cache-control']?.[0]

    if (cacheHeader?.includes('stale-while-revalidate')) {
      if (requestMode === 'odb') {
        const ttl = getMaxAge(cacheHeader)
        // Long-expiry TTL is basically no TTL, so we'll skip it
        if (ttl > 0 && ttl < ONE_YEAR_IN_SECONDS) {
          // ODBs currently have a minimum TTL of 60 seconds
          result.ttl = Math.max(ttl, 60)
        }
        const ephemeralCodes = [301, 302, 307, 308, 404]
        if (ttl === ONE_YEAR_IN_SECONDS && ephemeralCodes.includes(result.statusCode)) {
          // Only cache for 60s if default TTL provided
          result.ttl = 60
        }
        if (result.ttl > 0) {
          requestMode = `odb ttl=${result.ttl}`
        }
      }
      multiValueHeaders['cache-control'] = ['public, max-age=0, must-revalidate']
    }
    multiValueHeaders['x-nf-render-mode'] = [requestMode]

    console.log(`[${event.httpMethod}] ${event.path} (${requestMode?.toUpperCase()})`)

    return {
      ...result,
      multiValueHeaders,
      isBase64Encoded: result.encoding === 'base64',
    }
  }
}

export const getHandler = ({
  isODB = false,
  publishDir = '../../../.next',
  appDir = '../../..',
  appDirAbsolute = process.cwd(),
}): string => {
  const nextServerModuleLocation = getNextServerModulePath(appDirAbsolute)

  // This is a string, but if you have the right editor plugin it should format as js
  return javascript/* javascript */ `
  if (!${JSON.stringify(nextServerModuleLocation)}) {
    throw new Error('Could not find Next.js server')
  }

  const { Server } = require("http");
  const { promises } = require("fs");
  // We copy the file here rather than requiring from the node module
  const { Bridge } = require("./bridge");
  const { augmentFsModule, getMaxAge, getMultiValueHeaders, getPrefetchResponse, normalizePath } = require('./handlerUtils')
  const { getNetlifyNextServer } = require('./server')
  const NextServer = require(${JSON.stringify(nextServerModuleLocation)}).default

  ${isODB ? `const { builder } = require("@netlify/functions")` : ''}
  const { config }  = require("${publishDir}/required-server-files.json")
  let staticManifest
  try {
    staticManifest = require("${publishDir}/static-manifest.json")
  } catch {}
  const path = require("path");
  const pageRoot = path.resolve(path.join(__dirname, "${publishDir}", "server"));
  exports.handler = ${
    isODB
      ? `builder((${makeHandler.toString()})(config, "${appDir}", pageRoot, NextServer, staticManifest, 'odb'));`
      : `(${makeHandler.toString()})(config, "${appDir}", pageRoot, NextServer, staticManifest, 'ssr');`
  }
`
}
