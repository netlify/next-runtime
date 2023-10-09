import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions'
import '@vercel/node-bridge/bridge.js'

const require = createRequire(import.meta.url)

const { Bridge } = require('@vercel/node-bridge/bridge.js')
const { getRequestHandlers } = require('next/dist/server/lib/start-server.js')

const requiredServerFiles = require('./.next/required-server-files.json')

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

const __dirname = fileURLToPath(new URL('.', import.meta.url))

process.chdir(__dirname)

let bridge: typeof Bridge

export const handler: Handler = async function (event: HandlerEvent, context: HandlerContext) {
  if (!bridge) {
    // initialize Next.js and create the request handler
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

  return {
    ...result,
    headers,
    isBase64Encoded: result.encoding === 'base64',
  }
}
