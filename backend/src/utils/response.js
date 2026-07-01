/**
 * Send a successful JSON response.
 * @param {object} res - Express response object
 * @param {string} message - Human-readable message
 * @param {any} data - Payload (object, array, or null)
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 * @param {object} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status (default 400)
 */
const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

module.exports = { sendSuccess, sendError };
