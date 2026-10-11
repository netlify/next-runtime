// L6: runs one output's entrypoint for one request (Next's node handler, or an edge-runtime output
// in the sandbox), see docs/request-layers.md.
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { RequestMeta } from 'next-with-adapters/dist/server/request-meta.js'

import { PLUGIN_DIR } from '../../constants.js'
import { invokeEdgeRuntimeOutput } from '../edge-runtime-sandbox.js'
import { getLogger } from '../request-context.cjs'
import { getTracer, withActiveSpan } from '../tracer.cjs'

import { type InvokeHandlerArg, manifest } from './manifest.js'
import type { Outcome, ResponseSink } from './sink.js'
import type { InvokeOptions, ProduceRequest } from './types.js'

type NodeHandlerFn = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx?: { waitUntil?: (prom: Promise<void>) => void; requestMeta?: RequestMeta },
) => Promise<void>

// Netlify Adapter machinery (just for integration tests resetting global state in-between tests)
// TODO(adapter): figure out something better, we should not expose test-only globals in the actual adapter code
const NetlifyAdapterTestReset = Symbol.for('@netlify/adapter-test-reset')

// Cache loaded handler functions
const nodeHandlerCache = new Map<string, NodeHandlerFn>()

const extendedGlobalThis = globalThis as typeof globalThis & {
  // just for reset in-between tests, see tests/utils/fixture.ts
  [NetlifyAdapterTestReset]: () => void
}

extendedGlobalThis[NetlifyAdapterTestReset] = () => {
  nodeHandlerCache.clear()
}

function preferDefault(mod: unknown): unknown {
  return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod
}

// PLUGIN_DIR is the app dir inside the handler (where `.netlify` lives), output filePaths are relative
// to the handler root
export const handlerRootDir = resolvePath(
  PLUGIN_DIR,
  ...manifest.relativeAppDir
    .split('/')
    .filter(Boolean)
    .map(() => '..'),
)

async function loadHandler(filePath: string): Promise<NodeHandlerFn> {
  const resolvedPath = pathToFileURL(resolvePath(handlerRootDir, filePath)).href
  const cached = nodeHandlerCache.get(resolvedPath)
  if (cached) {
    return cached
  }
  const mod = await withActiveSpan(getTracer(), 'load route handler', (span) => {
    span?.setAttribute('filePath', filePath)
    // eslint-disable-next-line import/no-dynamic-require
    return import(resolvedPath)
  })
  const { handler } = (await preferDefault(mod)) as { handler: NodeHandlerFn }
  nodeHandlerCache.set(resolvedPath, handler)
  return handler
}

export async function invokeHandler(
  { id, entrypoint, runtime, sourcePage }: InvokeHandlerArg,
  {
    tracer,
    request,
    requestContext,
    resolution,
    span,
    invokeStatus,
    nextCallbacks,
  }: ProduceRequest,
  sink: ResponseSink,
  { invocationId, resume, postponed, onCacheEntry }: InvokeOptions = {},
): Promise<Outcome> {
  span?.setAttribute('matched.sourcePage', sourcePage)
  span?.setAttribute('matched.runtime', runtime)
  return await withActiveSpan(tracer, 'invoke route handler', async (invokeSpan) => {
    if (runtime === 'edge') {
      try {
        const response = await invokeEdgeRuntimeOutput({
          outputId: id,
          request,
          requestContext,
          manifest,
          query: resolution.resolvedQuery,
          routeParams: resolution.invocation?.requestMeta.params,
          // only `initURL`: the rest of what node outputs get (`query`, `params`) is folded into the
          // URL the sandbox invokes with, and as request meta it'd end up in `resolvedUrl` too
          requestMeta: { initURL: resolution.invocation?.requestMeta.initURL ?? request.url },
        })
        return await sink.send(response, { kind: 'final' })
      } catch (error) {
        console.error('edge runtime output error', error)
        getLogger().withError(error).error('edge runtime output error')
        invokeSpan?.setAttribute('http.status_code', 500)
        return await sink.send(new Response('Internal Server Error', { status: 500 }), {
          kind: 'final',
        })
      }
    }

    try {
      const handler = await loadHandler(entrypoint)

      // `@next/routing` says how to invoke the matched output (`req.url`, request meta), quirks
      // included; error pages are invoked without a resolution
      const { invocation } = resolution
      const handlerRequest = invocation
        ? new Request(new URL(invocation.url, request.url), request)
        : request
      // without one Next's minimal-mode response cache reuses renders across requests for 10s
      handlerRequest.headers.set('x-invocation-id', invocationId ?? randomUUID())
      for (const [key, value] of Object.entries(resume?.headers ?? {})) {
        handlerRequest.headers.set(key, value)
      }

      // Invoke the route handler using the Node.js handler signature
      // as defined by the Next.js adapter contract:
      // handler(req: IncomingMessage, res: ServerResponse, ctx)
      const outcome = await sink.render(
        handlerRequest,
        (req, res) =>
          handler(req, res, {
            waitUntil: requestContext.trackBackgroundWork,
            requestMeta: {
              ...(invocation?.requestMeta ?? { initURL: request.url }),
              render404: nextCallbacks.render404,
              revalidate: nextCallbacks.revalidate,
              minimalMode: true,
              ...((resume ?? postponed) && { postponed: resume?.postponed ?? postponed }),
              ...(onCacheEntry && {
                onCacheEntryV2: async (entry: Parameters<typeof onCacheEntry>[0]) => {
                  onCacheEntry(entry)
                  return false
                },
              }),
            },
          }),
        { kind: 'next' },
        { status: invokeStatus },
      )
      invokeSpan?.setAttribute('http.status_code', outcome === 'failed' ? 500 : (sink.status ?? 0))
      return outcome
    } catch (error) {
      console.error('route handler error', error)
      getLogger().withError(error).error('route handler error')
      invokeSpan?.setAttribute('http.status_code', 500)
      return await sink.send(new Response('Internal Server Error', { status: 500 }), {
        kind: 'final',
      })
    }
  })
}
