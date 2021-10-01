const { Server } = require('http')
const path = require('path')

const { Bridge } = require('@vercel/node/dist/bridge')
// This path is specific to next@canary. In a live version we'd resolve various versions of next
const NextServer = require('next/dist/server/next-server').default

const makeHandler =
  () =>
  // We return a function and then call `toString()` on it to serialise it as the launcher function
  (conf, app) => {
    const nextServer = new NextServer({
      conf,
      dir: path.resolve(__dirname, app),
      customServer: false,
    })
    const requestHandler = nextServer.getRequestHandler()
    const server = new Server(async (req, res) => {
      try {
        await requestHandler(req, res)
      } catch (error) {
        console.error(error)
        throw new Error('server function error')
      }
    })
    const bridge = new Bridge(server)
    bridge.listen()

    return async (event, context) => {
      const { headers, ...result } = await bridge.launcher(event, context)
      /** @type import("@netlify/functions").HandlerResponse */

      // Convert all headers to multiValueHeaders
      const multiValueHeaders = {}
      for (const key of Object.keys(headers)) {
        if (Array.isArray(headers[key])) {
          multiValueHeaders[key] = headers[key]
        } else {
          multiValueHeaders[key] = [headers[key]]
        }
      }

      if (
        multiValueHeaders['set-cookie'] &&
        multiValueHeaders['set-cookie'][0] &&
        multiValueHeaders['set-cookie'][0].includes('__prerender_bypass')
      ) {
        delete multiValueHeaders.etag
        multiValueHeaders['cache-control'] = ['no-cache']
      }

      return {
        ...result,
        multiValueHeaders,
        isBase64Encoded: result.encoding === 'base64',
      }
    }
  }

const getHandler = ({ isODB = false, publishDir = '../../../.next', appDir = '../../..' }) => `
const { Server } = require("http");
// We copy the file here rather than requiring from the node module
const { Bridge } = require("./bridge");
// Specific to this Next version
const NextServer = require("next/dist/server/next-server").default;
const { builder } = require("@netlify/functions");
const { config }  = require("${publishDir}/required-server-files.json")
const path = require("path");
exports.handler = ${
  isODB ? `builder((${makeHandler().toString()})(config));` : `(${makeHandler().toString()})(config, "${appDir}");`
}
`

module.exports = getHandler
