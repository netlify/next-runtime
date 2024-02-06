import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import { trace } from '@opentelemetry/api'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'

import { TagsManifest, getTagsManifest } from '../config.js'
import {
  adjustDateHeader,
  handleNextCacheHeader,
  setCacheControlHeaders,
  setCacheTagsHeaders,
  setVaryHeaders,
} from '../headers.js'
import { nextResponseProxy } from '../revalidate.js'
import { logger } from '../systemlog.js'

let nextHandler: WorkerRequestHandler, nextConfig: NextConfigComplete, tagsManifest: TagsManifest

export default async (request: Request) => {
  const tracer = trace.getTracer('Next.js Runtime')

  if (!nextHandler) {
    await tracer.startActiveSpan('initialize next server', async (span) => {
      // set the server config
      const { getRunConfig, setRunConfig } = await import('../config.js')
      nextConfig = await getRunConfig()
      setRunConfig(nextConfig)
      tagsManifest = await getTagsManifest()
      span.setAttributes(
        Object.entries(tagsManifest).reduce(
          (acc, [key, value]) => ({ ...acc, [`tagsManifest.${key}`]: value }),
          {},
        ),
      )

      const { getMockedRequestHandlers } = await import('../next.cjs')
      const url = new URL(request.url)

      ;[nextHandler] = await getMockedRequestHandlers({
        port: Number(url.port) || 443,
        hostname: url.hostname,
        dir: process.cwd(),
        isDev: false,
      })
      span.end()
    })
  }

  const { req, res } = toReqRes(request)

  const resProxy = nextResponseProxy(res)

  // temporary workaround for https://linear.app/netlify/issue/ADN-111/
  delete req.headers['accept-encoding']

  // We don't await this here, because it won't resolve until the response is finished.
  const nextHandlerPromise = nextHandler(req, resProxy).catch((error) => {
    logger.withError(error).error('next handler error')
    console.error(error)
    resProxy.statusCode = 500
    resProxy.end('Internal Server Error')
  })

  // Contrary to the docs, this resolves when the headers are available, not when the stream closes.
  // See https://github.com/fastly/http-compute-js/blob/main/src/http-compute-js/http-server.ts#L168-L173
  const response = await toComputeResponse(resProxy)

  await adjustDateHeader(response.headers, request)

  setCacheControlHeaders(response.headers, request)
  setCacheTagsHeaders(response.headers, request, tagsManifest)
  setVaryHeaders(response.headers, request, nextConfig)
  handleNextCacheHeader(response.headers)

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

  const keepOpenUntilNextFullyRendered = new TransformStream({
    flush() {
      // it's important to keep the stream open until the next handler has finished,
      // or otherwise the cache revalidates might not go through
      return nextHandlerPromise
    },
  })

  return new Response(response.body?.pipeThrough(keepOpenUntilNextFullyRendered), response)
}
