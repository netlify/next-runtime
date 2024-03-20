import {
  createRequestContext,
  runWithRequestContext,
} from './.netlify/dist/run/handlers/request-context.cjs'
import serverHandler from './.netlify/dist/run/handlers/server.js'
import { getTracer } from './.netlify/dist/run/handlers/tracer.cjs'
import tracing from './.netlify/dist/run/handlers/tracing.js'

export default async function handler(req, context) {
  if (process.env.NETLIFY_OTLP_TRACE_EXPORTER_URL) {
    tracing.start()
  }

  const requestContext = createRequestContext(req.headers.get('x-nf-debug-logging'))
  const tracer = getTracer()

  const handlerResponse = await runWithRequestContext(requestContext, () => {
    return tracer.withActiveSpan('Next.js Server Handler', async (span) => {
      span.setAttributes({
        'account.id': context.account.id,
        'deploy.id': context.deploy.id,
        'request.id': context.requestId,
        'site.id': context.site.id,
        'http.method': req.method,
        'http.target': req.url,
        monorepo: false,
        cwd: process.cwd(),
      })
      const response = await serverHandler(req, context)
      span.setAttributes({
        'http.status_code': response.status,
      })
      return response
    })
  })

  if (requestContext.serverTiming) {
    handlerResponse.headers.set('server-timing', requestContext.serverTiming)
  }

  return handlerResponse
}

export const config = {
  path: '/*',
  preferStatic: true,
}
