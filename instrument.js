const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 1.0, // capture 100% of traces for development
});