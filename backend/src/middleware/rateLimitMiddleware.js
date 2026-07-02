const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for authentication endpoints (BUG-012).
 *
 * Mitigates online password guessing / brute-force by capping the number of
 * attempts per IP within a time window. Returns the standard JSON envelope so
 * clients handle it like any other API error.
 */

const buildHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message, data: null });
};

// Login: strict — a handful of attempts per IP per window.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler('Too many login attempts. Please try again in a few minutes.'),
});

module.exports = { loginRateLimiter };
