/* eslint-disable max-lines-per-function */
const { promises, existsSync } = require('fs')
const { Server } = require('http')
const { tmpdir } = require('os')
const path = require('path')

const { Bridge } = require('@vercel/node/dist/bridge')

const { downloadFile, getMaxAge, getMultiValueHeaders } = require('./handlerUtils')

const makeHandler =
  () =>
  // We return a function and then call `toString()` on it to serialise it as the launcher function
  // eslint-disable-next-line max-params
  (conf, app, pageRoot, staticManifest = [], mode = 'ssr') => {
    // This is just so nft knows about the page entrypoints. It's not actually used
    try {
      // eslint-disable-next-line node/no-missing-require
      require.resolve('./pages.js')
    } catch {}
    // eslint-disable-next-line no-underscore-dangle
    process.env._BYPASS_SSG = 'true'

    const ONE_YEAR_IN_SECONDS = 31536000

    // We don't want to write ISR files to disk in the lambda environment
    conf.experimental.isrFlushToDisk = false

    // Set during the request as it needs the host header. Hoisted so we can define the function once
    let base

    // Only do this if we have some static files moved to the CDN
    if (staticManifest.length !== 0) {
      // These are static page files that have been removed from the function bundle
      // In most cases these are served from the CDN, but for rewrites Next may try to read them
      // from disk. We need to intercept these and load them from the CDN instead
      // Sadly the only way to do this is to monkey-patch fs.promises. Yeah, I know.
      const staticFiles = new Map(staticManifest)
      const downloadPromises = new Map()
      const statsCache = new Map()
      // Yes, you can cache stuff locally in a Lambda
      const cacheDir = path.join(tmpdir(), 'next-static-cache')
      // Grab the real fs.promises.readFile...
      const readfileOrig = promises.readFile
      const statsOrig = promises.stat
      // ...then money-patch it to see if it's requesting a CDN file
      promises.readFile = async (file, options) => {
        // We only care about page files
        if (file.startsWith(pageRoot)) {
          // We only want the part after `pages/`
          const filePath = file.slice(pageRoot.length + 1)

          // Is it in the CDN and not local?
          if (staticFiles.has(filePath) && !existsSync(file)) {
            // This name is safe to use, because it's one that was already created by Next
            const cacheFile = path.join(cacheDir, filePath)
            const url = `${base}/${staticFiles.get(filePath)}`

            // If it's already downloading we can wait for it to finish
            if (downloadPromises.has(url)) {
              await downloadPromises.get(url)
            }
            // Have we already cached it? We download every time if running locally to avoid staleness
            if ((!existsSync(cacheFile) || process.env.NETLIFY_DEV) && base) {
              await promises.mkdir(path.dirname(cacheFile), { recursive: true })

              try {
                // Append the path to our host and we can load it like a regular page
                const downloadPromise = downloadFile(url, cacheFile)
                downloadPromises.set(url, downloadPromise)
                await downloadPromise
              } finally {
                downloadPromises.delete(url)
              }
            }
            // Return the cache file
            return readfileOrig(cacheFile, options)
          }
        }

        return readfileOrig(file, options)
      }

      promises.stat = async (file, options) => {
        // We only care about page files
        if (file.startsWith(pageRoot)) {
          // We only want the part after `pages/`
          const cacheFile = path.join(cacheDir, file.slice(pageRoot.length + 1))
          if (existsSync(cacheFile)) {
            return statsOrig(cacheFile, options)
          }
        }
        return statsOrig(file, options)
      }
    }
    let NextServer
    try {
      // next >= 11.0.1. Yay breaking changes in patch releases!
      NextServer = require('next/dist/server/next-server').default
    } catch (error) {
      if (!error.message.includes("Cannot find module 'next/dist/server/next-server'")) {
        // A different error, so rethrow it
        throw error
      }
      // Probably an old version of next
    }

    if (!NextServer) {
      try {
        // next < 11.0.1
        // eslint-disable-next-line node/no-missing-require, import/no-unresolved
        NextServer = require('next/dist/next-server/server/next-server').default
      } catch (error) {
        if (!error.message.includes("Cannot find module 'next/dist/next-server/server/next-server'")) {
          throw error
        }
        throw new Error('Could not find Next.js server')
      }
    }

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
      let requestMode = mode
      // Ensure that paths are encoded - but don't double-encode them
      event.path = new URL(event.path, event.rawUrl).pathname
      // Next expects to be able to parse the query from the URL
      const query = new URLSearchParams(event.queryStringParameters).toString()
      event.path = query ? `${event.path}?${query}` : event.path
      // Only needed if we're intercepting static files
      if (staticManifest.length !== 0) {
        const { host } = event.headers
        const protocol = event.headers['x-forwarded-proto'] || 'http'
        base = `${protocol}://${host}`
      }
      const { headers, ...result } = await bridge.launcher(event, context)

      /** @type import("@netlify/functions").HandlerResponse */

      // Convert all headers to multiValueHeaders

      const multiValueHeaders = getMultiValueHeaders(headers)

      if (multiValueHeaders['set-cookie']?.[0]?.includes('__prerender_bypass')) {
        delete multiValueHeaders.etag
        multiValueHeaders['cache-control'] = ['no-cache']
      }

      // Sending SWR headers causes undefined behaviour with the Netlify CDN
      const cacheHeader = multiValueHeaders['cache-control']?.[0]

      if (cacheHeader?.includes('stale-while-revalidate')) {
        if (requestMode === 'odb' && process.env.EXPERIMENTAL_ODB_TTL) {
          requestMode = 'isr'
          const ttl = getMaxAge(cacheHeader)
          // Long-expiry TTL is basically no TTL
          if (ttl > 0 && ttl < ONE_YEAR_IN_SECONDS) {
            result.ttl = ttl
          }
          multiValueHeaders['x-rendered-at'] = [new Date().toISOString()]
        }
        multiValueHeaders['cache-control'] = ['public, max-age=0, must-revalidate']
      }
      multiValueHeaders['x-render-mode'] = [requestMode]
      return {
        ...result,
        multiValueHeaders,
        isBase64Encoded: result.encoding === 'base64',
      }
    }
  }

const getHandler = ({ isODB = false, publishDir = '../../../.next', appDir = '../../..' }) => `
const { Server } = require("http");
const { tmpdir } = require('os')
const { promises, existsSync } = require("fs");
// We copy the file here rather than requiring from the node module
const { Bridge } = require("./bridge");
const { downloadFile, getMaxAge, getMultiValueHeaders } = require('./handlerUtils')

const { builder } = require("@netlify/functions");
const { config }  = require("${publishDir}/required-server-files.json")
let staticManifest 
try {
  staticManifest = require("${publishDir}/static-manifest.json")
} catch {}
const path = require("path");
const pageRoot = path.resolve(path.join(__dirname, "${publishDir}", config.target === "server" ? "server" : "serverless", "pages"));
exports.handler = ${
  isODB
    ? `builder((${makeHandler().toString()})(config, "${appDir}", pageRoot, staticManifest, 'odb'));`
    : `(${makeHandler().toString()})(config, "${appDir}", pageRoot, staticManifest, 'ssr');`
}
`

module.exports = getHandler
/* eslint-enable max-lines-per-function */
