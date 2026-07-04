const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so :id (bookingId) is accessible
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createTransactionPayment,
  listTransactionPayments,
} = require('../controllers/transactionPaymentController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// /api/bookings/:id/transaction-payments
router.post('/', authenticate, authorize(...MANAGERS), createTransactionPayment);
router.get('/', authenticate, authorize(...CRM), listTransactionPayments);

module.exports = router;
