import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'

import { TASK_DIR } from '../helpers/constants.js'
import { getCacheControlHeaders, getVaryHeaders } from '../helpers/headers.js'

let nextHandler: WorkerRequestHandler, nextConfig: NextConfigComplete

export default async (request: Request) => {
  if (!nextHandler) {
    // set the server config
    const { getRunConfig, setRunConfig } = await import('../helpers/config.js')
    nextConfig = await getRunConfig()
    setRunConfig(nextConfig)

    // let Next.js initialize and create the request handler
    const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')
    ;[nextHandler] = await getRequestHandlers({
      port: 3000,
      hostname: 'localhost',
      dir: TASK_DIR,
      isDev: false,
    })
  }

  const { req, res } = toReqRes(request)

  try {
    console.log('Next server request:', req.url)
    await nextHandler(req, res)
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }

  const headers = res.getHeaders()
  new Map([
    ...getCacheControlHeaders(headers),
    ...getVaryHeaders(headers, req.url, nextConfig.basePath, nextConfig.i18n),
  ]).forEach(res.setHeader)

  // log the response from Next.js
  const response = { headers, statusCode: res.statusCode }
  console.log('Next server response:', JSON.stringify(response, null, 2))

  return toComputeResponse(res)
}
