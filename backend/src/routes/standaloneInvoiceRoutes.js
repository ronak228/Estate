const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getInvoice,
  getInvoicePdf,
  updateInvoiceStatus,
} = require('../controllers/invoiceController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// /api/invoices/:id
router.get('/:id', authenticate, authorize(...CRM), getInvoice);

// INTENTIONAL EXCEPTION: returns binary PDF, not JSON envelope
router.get('/:id/pdf', authenticate, authorize(...CRM), getInvoicePdf);

router.patch('/:id/status', authenticate, authorize(...MANAGERS), updateInvoiceStatus);

module.exports = router;
