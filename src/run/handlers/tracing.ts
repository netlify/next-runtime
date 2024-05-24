import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  ReadableSpan,
  SimpleSpanProcessor,
  SpanExporter,
  SpanProcessor,
} from '@opentelemetry/sdk-trace-node'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

import { logger } from '../systemlog.cjs'

const {
  default: { version, name },
} = await import('../../../package.json')

const spanProcessors: SpanProcessor[] = []
if (process.env.NETLIFY_OTLP_TRACE_EXPORTER_URL) {
  spanProcessors.push(
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.NETLIFY_OTLP_TRACE_EXPORTER_URL,
      }),
    ),
  )
}

if (process.env.NETLIFY_NEXT_PERF_DEBUG) {
  process.env.NEXT_OTEL_VERBOSE = '1'

  class CompactConsoleExporter implements SpanExporter {
    export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter['export']>[1]) {
      return this._sendSpans(spans, resultCallback)
    }

    shutdown() {
      this._sendSpans([])
      return this.forceFlush()
    }

    forceFlush() {
      return Promise.resolve()
    }

    _sendSpans(spans: ReadableSpan[], done?: Parameters<SpanExporter['export']>[1]) {
      for (const span of spans) {
        const startDate = new Date(span.startTime[0] * 10 ** 3 + span.startTime[1] / 10 ** 6)

        const durationS = span.duration[0] + span.duration[1] / 10 ** 9

        console.log(
          `[Trace ${span.spanContext().traceId}] ${`"${span.name}"`.padEnd(
            60,
            ' ',
          )} start=${startDate.toISOString()} dur=${durationS.toFixed(3)}s${
            span.events.length === 0
              ? ''
              : ` events=[${span.events
                  .map(
                    (event) =>
                      `{ name="${event.name}", time=${new Date(
                        event.time[0] * 10 ** 3 + event.time[1] / 10 ** 6,
                      ).toISOString()}}`,
                  )
                  .join(', ')}]`
          }`,
        )
      }
      if (done) {
        return done({ code: 0 })
      }
    }
  }

  spanProcessors.push(new SimpleSpanProcessor(new CompactConsoleExporter()))
}

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: name,
    [SEMRESATTRS_SERVICE_VERSION]: version,
  }),
  spanProcessors,
})
export default sdk

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      (error: unknown) => logger.withError(error).log('Error shutting down OpenTelemetry NodeSDK'),
    )
    // eslint-disable-next-line n/no-process-exit
    .finally(() => process.exit(0))
})
