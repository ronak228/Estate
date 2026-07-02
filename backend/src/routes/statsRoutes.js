const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getStats } = require('../controllers/statsController');

// Any authenticated user may fetch their own stats context.
router.get('/', authenticate, getStats);

module.exports = router;
