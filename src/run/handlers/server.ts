import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'

import { TagsManifest, getTagsManifest } from '../config.js'
import {
  adjustDateHeader,
  setCacheControlHeaders,
  setCacheTagsHeaders,
  setVaryHeaders,
} from '../headers.js'
import { nextResponseProxy } from '../revalidate.js'
import { logger } from '../systemlog.js'

let nextHandler: WorkerRequestHandler, nextConfig: NextConfigComplete, tagsManifest: TagsManifest

export default async (request: Request) => {
  if (!nextHandler) {
    // set the server config
    const { getRunConfig, setRunConfig } = await import('../config.js')
    nextConfig = await getRunConfig()
    setRunConfig(nextConfig)
    tagsManifest = await getTagsManifest()

    const { getMockedRequestHandlers } = await import('../next.cjs')
    const url = new URL(request.url)

    ;[nextHandler] = await getMockedRequestHandlers({
      port: Number(url.port) || 443,
      hostname: url.hostname,
      dir: process.cwd(),
      isDev: false,
    })
  }

  const { req, res } = toReqRes(request)

  const resProxy = nextResponseProxy(res)

  // temporary workaround for https://linear.app/netlify/issue/ADN-111/
  delete req.headers['accept-encoding']

  try {
    // console.log('Next server request:', req.url)
    await nextHandler(req, resProxy)
  } catch (error) {
    logger.withError(error).error('next handler error')
    console.error(error)
    resProxy.statusCode = 500
    resProxy.end('Internal Server Error')
  }

  // Contrary to the docs, this resolves when the headers are available, not when the stream closes.
  // See https://github.com/fastly/http-compute-js/blob/main/src/http-compute-js/http-server.ts#L168-L173
  const response = await toComputeResponse(resProxy)

  await adjustDateHeader(response.headers, request)

  setCacheControlHeaders(response.headers, request)
  setCacheTagsHeaders(response.headers, request, tagsManifest)
  setVaryHeaders(response.headers, request, nextConfig)

  // Temporary workaround for an issue where sending a response with an empty
  // body causes an unhandled error. This doesn't catch everything, but redirects are the
  // most common case of sending empty bodies. We can't check it directly because these are streams.
  // The side effect is that responses which do contain data will not be streamed to the client,
  // but that's fine for redirects.
  // TODO: Remove once a fix has been rolled out.
  if ((response.status > 300 && response.status < 400) || response.status >= 500) {
    const body = await response.text()
    return new Response(body || null, response)
  }

  return response
}
