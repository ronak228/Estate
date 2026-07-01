const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { login, getMe, changePassword, logout } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
