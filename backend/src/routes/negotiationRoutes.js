const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createNegotiation, listNegotiations } = require('../controllers/negotiationController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.post('/', authenticate, authorize(...CRM), createNegotiation);
router.get('/', authenticate, authorize(...CRM), listNegotiations);

module.exports = router;
