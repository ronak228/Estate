const multer = require('multer');
const logger = require('../utils/logger');

/**
 * Centralized error handler — registered last in server.js.
 * Catches anything not handled inline in controllers.
 * BUG-033 / P0-03: structured, redacted logging via the shared logger — never
 * dumps raw err objects that may contain secrets or PII.
 */
const errorMiddleware = (err, req, res, next) => {
  // Structured log: include method, path, status, and message only.
  // Avoid logging full error objects that may contain request bodies with PII.
  const status = err.statusCode || err.status || 500;
  logger.error(err.message || 'Internal server error', {
    method: req.method,
    path: req.path,
    status,
    code: err.code || undefined,
    // Stack only in non-production environments
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  // P3-25 fix: multer errors (oversized file, fileFilter rejection) previously
  // fell through to the generic 500 below since they carry no statusCode.
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
    });
  }

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
