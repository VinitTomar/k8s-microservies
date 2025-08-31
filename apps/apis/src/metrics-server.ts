import express from 'express';
import client from 'prom-client';

const register = client.register;
const metricsApp = express();

client.collectDefaultMetrics({
  prefix: "todo_apis_"
})

metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const METRICS_PORT = process.env.METRICS_PORT || 3081;
metricsApp.listen(METRICS_PORT, () => {
  console.log(`📊 Metrics server running on port ${METRICS_PORT}`);
});
