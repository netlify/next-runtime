import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import { HeadersSentEvent } from '@fastly/http-compute-js/dist/http-compute-js/http-outgoing.js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'
import { RUN_DIR } from '../constants.js'
import { setCacheControlHeaders, setCacheTagsHeaders, setVaryHeaders } from '../headers.js'

let nextHandler: WorkerRequestHandler, nextConfig: NextConfigComplete

export default async (request: Request) => {
  if (!nextHandler) {
    // set the server config
    const { getRunConfig, setRunConfig } = await import('../config.js')
    nextConfig = await getRunConfig()
    setRunConfig(nextConfig)

    // let Next.js initialize and create the request handler
    const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')
    ;[nextHandler] = await getRequestHandlers({
      port: 3000,
      hostname: 'localhost',
      dir: RUN_DIR,
      isDev: false,
    })
  }

  const { req, res } = toReqRes(request)

  res.prependListener('_headersSent', (event: HeadersSentEvent) => {
    const headers = new Headers(event.headers)
    setCacheControlHeaders(headers)
    setCacheTagsHeaders(headers)
    setVaryHeaders(headers, request, nextConfig)
    event.headers = Object.fromEntries(headers.entries())
    console.log('Modified response headers:', JSON.stringify(event.headers, null, 2))
  })

  try {
    console.log('Next server request:', req.url)
    await nextHandler(req, res)
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }

  // log the response from Next.js
  const response = { headers: res.getHeaders(), statusCode: res.statusCode }
  console.log('Next server response:', JSON.stringify(response, null, 2))

  return toComputeResponse(res)
}
