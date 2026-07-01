const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createQuotation,
  listQuotations,
  getQuotation,
  getQuotationPdf,
  updateDecision,
} = require('../controllers/quotationController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.post('/', authenticate, authorize(...CRM), createQuotation);
router.get('/', authenticate, authorize(...CRM), listQuotations);
router.get('/:id', authenticate, authorize(...CRM), getQuotation);
// NOTE: PDF endpoint intentionally bypasses the standard JSON envelope — returns binary PDF stream
router.get('/:id/pdf', authenticate, authorize(...CRM), getQuotationPdf);
router.patch('/:id/decision', authenticate, authorize(...CRM), updateDecision);

module.exports = router;
