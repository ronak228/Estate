/**
 * Structured logger (P0-03 fix, 2026-07-08).
 *
 * Replaces ad-hoc `console.log`/`console.error` calls with a single consistent
 * JSON-per-line format (level, timestamp, message, meta) so logs can be
 * filtered/aggregated by any log shipper (CloudWatch, Loki, Datadog, etc.)
 * without further code changes. This does not ship logs anywhere by itself —
 * it only makes stdout/stderr machine-parseable. Wire an error-tracking
 * service (e.g. Sentry) by adding a call inside `error()` once a DSN exists.
 */

const REDACT_KEYS = new Set([
  'password', 'passwordhash', 'token', 'secret', 'authorization',
  'jwt', 'jwt_secret', 'apikey', 'api_key',
]);

// Shallow-redact known-sensitive keys so they never reach stdout, even if a
// caller accidentally passes a full request body or user row as meta.
const redact = (meta) => {
  if (!meta || typeof meta !== 'object') return meta;
  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return out;
};

const write = (level, message, meta) => {
  const line = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...(meta !== undefined && { meta: redact(meta) }),
  };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
};

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
