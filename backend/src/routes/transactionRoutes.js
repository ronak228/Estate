const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so :id (bookingId) is accessible
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createTransaction,
  getTransaction,
  updateTransactionStatus,
  syncTransactionErp,
} = require('../controllers/transactionController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

router.post('/', authenticate, authorize(...MANAGERS), createTransaction);
router.get('/', authenticate, authorize(...CRM), getTransaction);
router.patch('/status', authenticate, authorize(...MANAGERS), updateTransactionStatus);
router.post('/erp-sync', authenticate, authorize('ADMIN'), syncTransactionErp);

module.exports = router;
