import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

const {
  default: { version, name },
} = await import('../../../package.json')

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: name,
    [SEMRESATTRS_SERVICE_VERSION]: version,
  }),
  spanProcessor: new SimpleSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.NETLIFY_OTLP_TRACE_EXPORTER_URL,
    }),
  ),
})
export default sdk

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => {},
      (error: unknown) => console.log('Error shutting down OpenTelemetry NodeSDK', error),
    )
    // eslint-disable-next-line n/no-process-exit
    .finally(() => process.exit(0))
})
