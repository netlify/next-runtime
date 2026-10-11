// Static outputs reached through the function (routing landed on one): proxied from the CDN.
import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

import {
  encodeRouteBrackets,
  withFlightVary,
} from '../../../adapter-runtime-shared/next-routing.js'
import { proxyExternalRewrite } from '../../../adapter-runtime-shared/proxy-external-rewrite.js'

import { handlerRootDir } from './invoke.js'
import { manifest, type StaticFileHandlerArg } from './manifest.js'
import type { Outcome, ResponseSink } from './sink.js'
import type { ProduceRequest } from './types.js'

export async function serverStaticFile(
  { filePath, pathname, bundled }: StaticFileHandlerArg,
  { request }: ProduceRequest,
  sink: ResponseSink,
): Promise<Outcome> {
  // an error page compute renders mid-request: fetching it from the CDN would go through routing
  // (the routing edge function) again
  if (bundled) {
    sink.describe({ kind: 'static-page', fullyStatic: true })
    return sink.send(
      new Response(await readFile(resolvePath(handlerRootDir, filePath)), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
  }
  // Every static output is on the CDN (copyStaticAssets), and the routing edge function forwards a
  // request routed to one there. Getting here means the function routed the request itself (nothing
  // in front of it, like the integration tests' emulated CDN): fetch it from the CDN.
  if (new URL(request.url).pathname === pathname) {
    // the CDN doesn't have it either (see copyStaticAssets), don't loop through it
    sink.describe({ kind: 'final' })
    return sink.send(new Response('Not Found', { status: 404 }))
  }
  // by its published file name, which the CDN serves as is: the route's pathname gets the CDN's own
  // URL normalization (pretty URLs, encoding), answered with a redirect instead of the file
  const publishedPath = manifest.routingConfig.publishedPaths[pathname] ?? pathname
  const response = await proxyExternalRewrite(
    new URL(encodeRouteBrackets(publishedPath), request.url),
    request,
  )
  // a static output can't change within a deploy, so the proxied copy is cached like the file
  sink.describe({ kind: 'static-page', fullyStatic: true })
  return sink.send(withFlightVary(request, response))
}
