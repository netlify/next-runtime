import { join } from 'node:path'

import { execute, getLogger } from 'lambda-local'

import { streamToBuffer } from './stream-to-buffer.mjs'
import { createBlobContext } from './create-blob-context.mjs'

const SERVER_HANDLER_NAME = '___netlify-server-handler'

getLogger().level = 'alert'

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

      const response = await execute({
        event: {
          headers: headers || {},
          httpMethod: httpMethod || 'GET',
          rawUrl: new URL(url || '/', 'https://example.netlify').href,
        },
        environment,
        envdestroy: true,
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
