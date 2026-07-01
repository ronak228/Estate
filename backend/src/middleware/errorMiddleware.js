/**
 * Centralized error handler — registered last in server.js.
 * Catches anything not handled inline in controllers.
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR]', err);

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
