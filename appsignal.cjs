// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Appsignal } = require('@appsignal/nodejs');

new Appsignal({
  active: !!process.env.APPSIGNAL_PUSH_API_KEY,
  name: 'Brussels Governance Monitor',
  pushApiKey: process.env.APPSIGNAL_PUSH_API_KEY,
  environment: process.env.NODE_ENV || 'development',
  disableDefaultInstrumentations: ['@opentelemetry/instrumentation-http'],
});
