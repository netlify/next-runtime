/* eslint-disable @typescript-eslint/no-var-requires, n/exports-style, func-names */

const http = require('http')

const { Bridge } = require('@vercel/node-bridge/bridge')
const { getRequestHandlers } = require('next/dist/server/lib/start-server')

process.env.NODE_ENV = 'production'
process.chdir(__dirname)

const currentPort = Number.parseInt(process.env.PORT) || 3000
const hostname = process.env.HOSTNAME || 'localhost'
const nextConfig = {}

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

let bridge

exports.handler = async function (event, context) {
  if (!bridge) {
    // let Next.js initialize and create the request handler
    const [nextHandler] = await getRequestHandlers({
      port: currentPort,
      hostname,
      dir: __dirname,
    })

    // create a standard HTTP server that will receive
    // requests from the bridge and send them to Next.js
    const server = http.createServer(async (req, res) => {
      try {
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

/* eslint-enable @typescript-eslint/no-var-requires, n/exports-style, func-names */
