import { HandlerContext, HandlerEvent } from '@netlify/functions'
import type { Bridge as NodeBridge } from '@vercel/node-bridge/bridge'
// Aliasing like this means the editor may be able to syntax-highlight the string
import { outdent as javascript } from 'outdent'

import { ApiConfig } from '../helpers/analysis'
import type { NextConfig } from '../helpers/config'
import { ApiRouteType } from '../helpers/types'

import type { NextServerType } from './handlerUtils'

/* eslint-disable @typescript-eslint/no-var-requires */

const { Server } = require('http')
const path = require('path')
// eslint-disable-next-line n/prefer-global/url, n/prefer-global/url-search-params
const { URLSearchParams, URL } = require('url')

const { Bridge } = require('@vercel/node-bridge/bridge')

const { getMultiValueHeaders } = require('./handlerUtils')
/* eslint-enable @typescript-eslint/no-var-requires */

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

type MakeApiHandlerParams = {
  conf: NextConfig
  app: string
  pageRoot: string
  page: string
  NextServer: NextServerType
}

// We return a function and then call `toString()` on it to serialise it as the launcher function
const makeApiHandler = ({ conf, app, pageRoot, page, NextServer }: MakeApiHandlerParams) => {
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

  // React assumes you want development mode if NODE_ENV is unset.

  ;(process.env as Mutable<NodeJS.ProcessEnv>).NODE_ENV ||= 'production'

  // We don't want to write ISR files to disk in the lambda environment
  conf.experimental.isrFlushToDisk = false
  // This is our flag that we use when patching the source
  // eslint-disable-next-line no-underscore-dangle
  process.env._BYPASS_SSG = 'true'
  for (const [key, value] of Object.entries(conf.env)) {
    process.env[key] = String(value)
  }

  // We memoize this because it can be shared between requests, but don't instantiate it until
  // the first request because we need the host and port.
  let bridge: NodeBridge
  const getBridge = (event: HandlerEvent): NodeBridge => {
    if (bridge) {
      return bridge
    }
    // Scheduled functions don't have a URL, but we need to give one so Next knows the route to serve
    const url = event.rawUrl ? new URL(event.rawUrl) : new URL(path, process.env.URL || 'http://n')
    const port = Number.parseInt(url.port) || 80

    const nextServer = new NextServer({
      conf,
      dir,
      customServer: false,
      hostname: url.hostname,
      port,
    })
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
    // Ensure that paths are encoded - but don't double-encode them
    event.path = event.rawUrl ? new URL(event.rawUrl).pathname : page
    // Next expects to be able to parse the query from the URL
    const query = new URLSearchParams(event.queryStringParameters).toString()
    event.path = query ? `${event.path}?${query}` : event.path
    // We know the page
    event.headers['x-matched-path'] = page
    const { headers, ...result } = await getBridge(event).launcher(event, context)

    // Convert all headers to multiValueHeaders

    const multiValueHeaders = getMultiValueHeaders(headers)

    multiValueHeaders['cache-control'] = ['public, max-age=0, must-revalidate']
    console.log(`[${event.httpMethod}] ${event.path} (API)`)
    return {
      ...result,
      multiValueHeaders,
      isBase64Encoded: result.encoding === 'base64',
    }
  }
}

/**
 * Handlers for API routes are simpler than page routes, but they each have a separate one
 */
export const getApiHandler = ({
  page,
  config,
  publishDir = '../../../.next',
  appDir = '../../..',
  nextServerModuleRelativeLocation,
}: {
  page: string
  config: ApiConfig
  publishDir?: string
  appDir?: string
  nextServerModuleRelativeLocation: string | undefined
}): string =>
  // This is a string, but if you have the right editor plugin it should format as js
  javascript/* javascript */ `
  if (!${JSON.stringify(nextServerModuleRelativeLocation)}) {
    throw new Error('Could not find Next.js server')
  }

  const { Server } = require("http");
  // We copy the file here rather than requiring from the node module
  const { Bridge } = require("./bridge");
  const { getMultiValueHeaders } = require('./handlerUtils')
  const NextServer = require(${JSON.stringify(nextServerModuleRelativeLocation)}).default

  ${config.type === ApiRouteType.SCHEDULED ? `const { schedule } = require("@netlify/functions")` : ''}


  const { config }  = require("${publishDir}/required-server-files.json")
  let staticManifest
  const path = require("path");
  const pageRoot = path.resolve(path.join(__dirname, "${publishDir}", "server"));
  const handler = (${makeApiHandler.toString()})({ conf: config, app: "${appDir}", pageRoot, page:${JSON.stringify(
    page,
  )}, NextServer})
  exports.handler = ${
    config.type === ApiRouteType.SCHEDULED ? `schedule(${JSON.stringify(config.schedule)}, handler);` : 'handler'
  }
`
