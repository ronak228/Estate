const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimitMiddleware');
const { login, getMe, changePassword, logout } = require('../controllers/authController');

router.post('/login', loginRateLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
