const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createBooking,
  listBookings,
  getBooking,
  getBookingReceipt,
  retryErpSync,
  addPayment,
  listPayments,
} = require('../controllers/bookingController');
const {
  uploadDocument,
  listDocuments,
  deleteDocument,
} = require('../controllers/bookingDocumentController');
const { bookingDocumentUploader } = require('../middleware/uploadMiddleware');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(...MANAGERS), createBooking);
router.get('/', authenticate, authorize(...CRM), listBookings);
router.get('/:id', authenticate, authorize(...CRM), getBooking);

// NOTE: Receipt endpoint returns binary PDF — not JSON envelope (by design)
router.get('/:id/receipt', authenticate, authorize(...CRM), getBookingReceipt);

// ERP retry (ADMIN/MANAGER only — money-sensitive action)
router.post('/:id/sync-erp', authenticate, authorize(...MANAGERS), retryErpSync);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post('/:id/payments', authenticate, authorize(...MANAGERS), addPayment);
router.get('/:id/payments', authenticate, authorize(...CRM), listPayments);

// ─── Documents ────────────────────────────────────────────────────────────────
router.post(
  '/:id/documents',
  authenticate,
  authorize(...CRM),
  bookingDocumentUploader.single('file'),
  uploadDocument
);
router.get('/:id/documents', authenticate, authorize(...CRM), listDocuments);
router.delete('/:id/documents/:documentId', authenticate, authorize(...MANAGERS), deleteDocument);

module.exports = router;
