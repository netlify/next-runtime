import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import { HeadersSentEvent } from '@fastly/http-compute-js/dist/http-compute-js/http-outgoing.js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path/posix'
import { CacheEntryValue, PageCacheValue } from '../../build/content/prerendered.js'
import { RUN_DIR } from '../constants.js'
import { setCacheControlHeaders, setCacheTagsHeaders, setVaryHeaders } from '../headers.js'
import { nextResponseProxy } from '../revalidate.js'

export type PageCacheEntry = CacheEntryValue & { value: PageCacheValue }

let nextHandler: WorkerRequestHandler,
  nextConfig: NextConfigComplete,
  cacheEntry: PageCacheEntry | undefined | null

export default async (request: Request) => {
  if (!nextHandler) {
    // set the server config
    const { getRunConfig, setRunConfig } = await import('../config.js')
    nextConfig = await getRunConfig()
    setRunConfig(nextConfig)

    cacheEntry = await getCacheEntry(request)

    const { getMockedRequestHandlers } = await import('./next.cjs')

    ;[nextHandler] = await getMockedRequestHandlers({
      port: 3000,
      hostname: 'localhost',
      dir: RUN_DIR,
      isDev: false,
    })
  }

  const { req, res } = toReqRes(request)

  const resProxy = nextResponseProxy(res)

  resProxy.prependListener('_headersSent', (event: HeadersSentEvent) => {
    const headers = new Headers(event.headers)
    setCacheControlHeaders(headers)
    setCacheTagsHeaders(request, headers, cacheEntry)
    setVaryHeaders(headers, request, nextConfig)
    event.headers = Object.fromEntries(headers.entries())
    // console.log('Modified response headers:', JSON.stringify(event.headers, null, 2))
  })

  // temporary workaround for https://linear.app/netlify/issue/ADN-111/
  delete req.headers['accept-encoding']

  try {
    // console.log('Next server request:', req.url)
    await nextHandler(req, resProxy)
  } catch (error) {
    console.error(error)
    resProxy.statusCode = 500
    resProxy.end('Internal Server Error')
  }

  // log the response from Next.js
  const response = {
    headers: resProxy.getHeaders(),
    statusCode: resProxy.statusCode,
  }
  // console.log('Next server response:', JSON.stringify(response, null, 2))

  return toComputeResponse(resProxy)
}

const prerenderManifest = JSON.parse(
  readFileSync(join(process.cwd(), '.next/prerender-manifest.json'), 'utf-8'),
)

const getCacheEntry = async (request: Request) => {
  // dynamically importing to avoid calling NetlifyCacheHandler beforhand
  // @ts-expect-error
  const NetlifyCacheHandler = await import('../../../dist/run/handlers/cache.cjs')
  // Have to assign NetlifyCacheHandler.default to new variable to prevent error: `X is not a constructor`
  const CacheHandler = NetlifyCacheHandler.default
  const cache = new CacheHandler({
    _appDir: true,
    revalidateTags: [],
    _requestHandler: {},
  })
  const path = new URL(request.url).pathname
  // Checking if route is in prerender manifest before retrieving pageData from Blob
  if (prerenderManifest.routes[path]) {
    return await cache.get(path, { type: 'json' })
  }
}
