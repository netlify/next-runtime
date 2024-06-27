import { Buffer } from 'node:buffer'
import { join } from 'node:path'

import { execute, getLogger } from 'lambda-local'

const SERVER_HANDLER_NAME = '___netlify-server-handler'
const BLOB_TOKEN = 'secret-token'

getLogger().level = 'alert'

const createBlobContext = (ctx) =>
  Buffer.from(
    JSON.stringify({
      edgeURL: `http://${ctx.blobStoreHost}`,
      uncachedEdgeURL: `http://${ctx.blobStoreHost}`,
      token: BLOB_TOKEN,
      siteID: ctx.siteID,
      deployID: ctx.deployID,
      primaryRegion: 'us-test-1',
    }),
  ).toString('base64')

function streamToBuffer(stream) {
  const chunks = []

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

process.on('message', async (msg) => {
  if (msg?.action === 'exit') {
    process.exit(0)
  } else if (msg?.action === 'invokeFunction') {
    try {
      const [ctx, options] = msg.args
      const { httpMethod, headers, body, url, env } = options

      const { handler } = await import(
        'file:///' + join(ctx.functionDist, SERVER_HANDLER_NAME, '___netlify-entry-point.mjs')
      )

      const environment = {
        NODE_ENV: 'production',
        NETLIFY_BLOBS_CONTEXT: createBlobContext(ctx),
        ...(env || {}),
      }

      const envVarsToRestore = {}

      // We are not using lambda-local's environment variable setting because it cleans up
      // environment vars to early (before stream is closed)
      Object.keys(environment).forEach(function (key) {
        if (typeof process.env[key] !== 'undefined') {
          envVarsToRestore[key] = process.env[key]
        }
        process.env[key] = environment[key]
      })

      const response = await execute({
        event: {
          headers: headers || {},
          httpMethod: httpMethod || 'GET',
          rawUrl: new URL(url || '/', 'https://example.netlify').href,
        },
        lambdaFunc: { handler },
        timeoutMs: 4_000,
      })

      const responseHeaders = Object.entries(response.multiValueHeaders || {}).reduce(
        (prev, [key, value]) => ({
          ...prev,
          [key]: value.length === 1 ? `${value}` : value.join(', '),
        }),
        response.headers || {},
      )

      const bodyBuffer = await streamToBuffer(response.body)

      Object.keys(environment).forEach(function (key) {
        if (typeof envVarsToRestore[key] !== 'undefined') {
          process.env[key] = envVarsToRestore[key]
        } else {
          delete process.env[key]
        }
      })

      const result = {
        statusCode: response.statusCode,
        bodyBuffer,
        body: bodyBuffer.toString('utf-8'),
        headers: responseHeaders,
        isBase64Encoded: response.isBase64Encoded,
      }

      if (process.send) {
        process.send({
          action: 'invokeFunctionResult',
          result,
        })
      }
    } catch (e) {
      console.log('error', e)
      process.exit(1)
    }
  }
})
