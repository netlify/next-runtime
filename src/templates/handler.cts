import http from 'node:http'

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
// @ts-ignore
import { Bridge } from '@vercel/node-bridge/bridge'
// @ts-ignore
import { getRequestHandlers } from 'next/dist/server/lib/start-server.js'

// @ts-ignore
import requiredServerFiles from './.next/required-server-files.json'

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

process.chdir(__dirname)

let bridge: Bridge

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

  return {
    ...result,
    headers,
    isBase64Encoded: result.encoding === 'base64',
  }
}
