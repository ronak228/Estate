const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const companyRoutes = require('./companyRoutes');
const projectRoutes = require('./projectRoutes');
const inquiryRoutes = require('./inquiryRoutes');
const contactRoutes = require('./contactRoutes');
const siteVisitRoutes = require('./siteVisitRoutes');
const unitRoutes = require('./unitRoutes');
const quotationRoutes = require('./quotationRoutes');
const negotiationRoutes = require('./negotiationRoutes');
const bookingRoutes = require('./bookingRoutes');
const statsRoutes = require('./statsRoutes');

// ─── Module 6: Transaction Execution & Closing ───────────────────────────────
const { listTransactions } = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const standaloneInvoiceRoutes = require('./standaloneInvoiceRoutes');
const standaloneTransactionPaymentRoutes = require('./standaloneTransactionPaymentRoutes');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/projects', projectRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/contacts', contactRoutes);
router.use('/site-visits', siteVisitRoutes);
router.use('/units', unitRoutes);
router.use('/quotations', quotationRoutes);
router.use('/negotiations', negotiationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/stats', statsRoutes);

// ─── Module 6 top-level routes ────────────────────────────────────────────────
// GET /api/transactions — sidebar-level list of all transaction records for the company
router.get('/transactions', authenticate, authorize(...CRM), listTransactions);

// /api/invoices/:id, /api/invoices/:id/pdf, /api/invoices/:id/status
router.use('/invoices', standaloneInvoiceRoutes);

// /api/transaction-payments/:id/reconcile
router.use('/transaction-payments', standaloneTransactionPaymentRoutes);

module.exports = router;
