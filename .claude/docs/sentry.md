# Sentry Integration

Use `import * as Sentry from "@sentry/nextjs"` for all Sentry functionality. Key patterns:

- Exception catching: `Sentry.captureException(error)`
- Tracing spans: `Sentry.startSpan({ op: 'ui.click', name: 'Button Click' }, span => { ... })`
- Logging: `const { logger } = Sentry` then `logger.info('message', { key: value })`
