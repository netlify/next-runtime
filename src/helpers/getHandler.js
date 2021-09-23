const { Server } = require('http')
const path = require('path')

const { Bridge } = require('@vercel/node/dist/bridge')
// This path is specific to next@canary. In a live version we'd resolve various versions of next
const NextServer = require('next/dist/server/next-server').default

const makeHandler =
  () =>
  // We return a function and then call `toString()` on it to serialise it as the launcher function
  (conf) => {
    const nextServer = new NextServer({
      conf,
      dir: path.resolve(__dirname, '../../..'),
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
      const result = await bridge.launcher(event, context)
      /** @type import("@netlify/functions").HandlerResponse */
      return {
        ...result,
        isBase64Encoded: result.encoding === 'base64',
      }
    }
  }

const getHandler = (isODB = false) => `
const { Server } = require("http");
// We copy the file here rather than requiring from the node module
const { Bridge } = require("./bridge");
// Specific to this Next version
const NextServer = require("next/dist/server/next-server").default;
const { builder } = require("@netlify/functions");
// We shouldn't hard-code ".next" as the path, and should extract it from the next config
const { config }  = require("../../../.next/required-server-files.json")
const path = require("path");
exports.handler = ${
  isODB ? `builder((${makeHandler().toString()})(config));` : `(${makeHandler().toString()})(config);`
}
`

module.exports = getHandler
