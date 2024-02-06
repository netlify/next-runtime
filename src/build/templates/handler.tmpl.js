import serverHandler from './dist/run/handlers/server.js'
import tracing, { trace } from './dist/run/handlers/tracing.js'

export default function handler(req, context) {
  if (process.env.NETLIFY_OTLP_TRACE_EXPORTER_URL) {
    tracing.start()
  }
  return trace
    .getTracer('Next.js Runtime')
    .startActiveSpan('Next.js Server Handler', async (span) => {
      try {
        span.setAttributes({
          'account.id': context.account.id,
          'deploy.id': context.deploy.id,
          'request.id': context.requestId,
          'site.id': context.site.id,
        })
        return serverHandler(req, context)
      } catch (error) {
        span.recordException(error)
      } finally {
        span.end()
      }
    })
}

export const config = {
  path: '/*',
  preferStatic: true,
}
