const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { globalSearch } = require('../controllers/searchController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.get('/', authenticate, authorize(...CRM), globalSearch);

module.exports = router;
