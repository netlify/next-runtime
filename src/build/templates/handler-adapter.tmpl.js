import { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import {
  setupHoneycombTracing,
  withHoneycombTracing,
} from '{{runtimeModulesDir}}/dist/adapter-runtime-shared/honeycomb-tracing.js'
import { FetchSink } from '{{runtimeModulesDir}}/dist/run/handlers/adapter/sink.js'
import {
  createRequestContext,
  runWithRequestContext,
} from '{{runtimeModulesDir}}/dist/run/handlers/request-context.cjs'
import serverHandler from '{{runtimeModulesDir}}/dist/run/handlers/server-adapter.js'
import { getTracer, withActiveSpan } from '{{runtimeModulesDir}}/dist/run/handlers/tracer.cjs'

// eslint-disable-next-line no-constant-condition
if ('{{cwd}}' && '{{cwd}}' !== '.') {
  process.chdir('{{cwd}}')
}

// Set feature flag for regional blobs
process.env.USE_REGIONAL_BLOBS = '{{useRegionalBlobs}}'

await setupHoneycombTracing('next-runtime-function', {
  ...JSON.parse(Buffer.from('{{honeycombBuildConfig}}', 'base64').toString()),
  // what Next does after an app's instrumentation registers a provider: spans start outside the
  // prerender's scope, or their random ids and timestamps abort Cache Components prerenders
  afterRegistration: () =>
    createRequire(join(process.cwd(), 'package.json'))(
      'next/dist/server/lib/router-utils/instrumentation-node-extensions.js',
    ).afterRegistration(),
})

export default (req, context) =>
  withHoneycombTracing(req, context.waitUntil?.bind(context), async () => {
    const sink = await handler(
      req,
      context,
      // without `context.waitUntil`, background work keeps the response open
      (requestContext) =>
        new FetchSink({ keepOpenUntil: () => requestContext.backgroundWorkPromise }),
    )
    return sink.response
  })

// `createSink`: what the response is written into, the only part that depends on how it's answered
async function handler(req, context, createSink) {
  const requestContext = createRequestContext(req, context)
  const tracer = getTracer()
  const sink = createSink(requestContext)
  sink.onCommit((head) => {
    if (requestContext.serverTiming) {
      head.headers.set('server-timing', requestContext.serverTiming)
    }
    return head
  })

  await runWithRequestContext(requestContext, () => {
    return withActiveSpan(tracer, 'Next.js Server Handler', async (span) => {
      span?.setAttributes({
        'account.id': context.account.id,
        'deploy.id': context.deploy.id,
        'request.id': context.requestId,
        'site.id': context.site.id,
        'http.method': req.method,
        'http.target': req.url,
        isBackgroundRevalidation: requestContext.isBackgroundRevalidation,
        cwd: '{{cwd}}',
      })
      await serverHandler(req, requestContext, sink)
      span?.setAttributes({
        'http.status_code': sink.status,
      })
    })
  })

  return sink
}

export const config = {
  path: '/*',
  preferStatic: true,
}
