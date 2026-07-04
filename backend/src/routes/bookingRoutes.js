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
  cancelBooking,
} = require('../controllers/bookingController');
const {
  uploadDocument,
  listDocuments,
  deleteDocument,
  downloadDocument,
} = require('../controllers/bookingDocumentController');
const { bookingDocumentUploader } = require('../middleware/uploadMiddleware');

// Module 5 — nested routes
const contractDocumentRoutes = require('./contractDocumentRoutes');
const dueDiligenceRoutes = require('./dueDiligenceRoutes');
const financingRoutes = require('./financingRoutes');

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

// Cancellation — releases the unit and reverts the inquiry (ADMIN/MANAGER only)
router.post('/:id/cancel', authenticate, authorize(...MANAGERS), cancelBooking);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post('/:id/payments', authenticate, authorize(...MANAGERS), addPayment);
router.get('/:id/payments', authenticate, authorize(...CRM), listPayments);

// ─── Booking Documents (Module 4) ─────────────────────────────────────────────
router.post(
  '/:id/documents',
  authenticate,
  authorize(...CRM),
  bookingDocumentUploader.single('file'),
  uploadDocument
);
router.get('/:id/documents', authenticate, authorize(...CRM), listDocuments);
router.get(
  '/:id/documents/:documentId/download',
  authenticate,
  authorize(...CRM),
  downloadDocument
);
router.delete('/:id/documents/:documentId', authenticate, authorize(...MANAGERS), deleteDocument);

// ─── Module 5: Contract Documents, Due Diligence, Financing ──────────────────
router.use('/:id/contract-documents', contractDocumentRoutes);
router.use('/:id/due-diligence', dueDiligenceRoutes);
router.use('/:id/financing', financingRoutes);

// ─── Module 6: Transaction Execution & Closing ───────────────────────────────
const transactionRoutes = require('./transactionRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const transactionPaymentRoutes = require('./transactionPaymentRoutes');
const titleTransferRoutes = require('./titleTransferRoutes');

router.use('/:id/transaction', transactionRoutes);
router.use('/:id/invoices', invoiceRoutes);
router.use('/:id/transaction-payments', transactionPaymentRoutes);
router.use('/:id/title-transfer', titleTransferRoutes);

module.exports = router;
