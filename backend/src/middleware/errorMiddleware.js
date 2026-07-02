/**
 * Centralized error handler — registered last in server.js.
 * Catches anything not handled inline in controllers.
 * BUG-033: structured, redacted logging — never dumps raw err objects that may
 * contain secrets or PII.
 */
const errorMiddleware = (err, req, res, next) => {
  // Structured log: include method, path, status, and message only.
  // Avoid logging full error objects that may contain request bodies with PII.
  const status = err.statusCode || err.status || 500;
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status,
    message: err.message || 'Internal server error',
    code: err.code || undefined,
    // Stack only in non-production environments
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  }));

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      data: null,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found',
      data: null,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

module.exports = errorMiddleware;
