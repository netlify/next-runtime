import tracing, { trace } from '{{cwd}}/dist/run/handlers/tracing.js'

process.chdir('{{cwd}}')

let cachedHandler
export default async function (req, context) {
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
          monorepo: true,
          cwd: '{{cwd}}',
        })
        if (!cachedHandler) {
          const { default: handler } = await import('./{{nextServerHandler}}')
          cachedHandler = handler
        }
        return cachedHandler(req, context)
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
