const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { reconcilePayment } = require('../controllers/transactionPaymentController');

const MANAGERS = ['ADMIN', 'MANAGER'];

// /api/transaction-payments/:id/reconcile
router.patch('/:id/reconcile', authenticate, authorize(...MANAGERS), reconcilePayment);

module.exports = router;
