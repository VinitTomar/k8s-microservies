import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';

console.log("Preparing auto node instrumentation");

const traceExporter = new OTLPTraceExporter({
  url: process.env.TEMPO_URL!,
});

const sdk = new NodeSDK({
  traceExporter,
  serviceName: 'todo-api',
  instrumentations: [
    getNodeAutoInstrumentations(),
    // new MySQL2Instrumentation()
    // new MySQL2Instrumentation({
    //   requireParentSpan: false,
    //   responseHook: (span, responseInfo) => {
    //     span.setAttribute('db.response', JSON.stringify(responseInfo));
    //   },
    // }),
  ],
});


try {
  sdk.start();
  console.log('✅ OpenTelemetry tracing initialized');
} catch (err) {
  console.error('❌ Error starting OpenTelemetry SDK', err);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((err) => console.error('Error terminating tracing', err))
    .finally(() => process.exit(0));
});
