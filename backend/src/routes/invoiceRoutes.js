const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so :id (bookingId) is accessible
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createInvoice,
  listInvoices,
} = require('../controllers/invoiceController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// /api/bookings/:id/invoices
router.post('/', authenticate, authorize(...MANAGERS), createInvoice);
router.get('/', authenticate, authorize(...CRM), listInvoices);

module.exports = router;
