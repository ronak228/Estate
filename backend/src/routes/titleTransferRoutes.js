const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so :id (bookingId) is accessible
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createTitleTransfer,
  getTitleTransfer,
  updateTitleTransfer,
} = require('../controllers/titleTransferController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// /api/bookings/:id/title-transfer
router.post('/', authenticate, authorize(...MANAGERS), createTitleTransfer);
router.get('/', authenticate, authorize(...CRM), getTitleTransfer);
router.patch('/', authenticate, authorize(...MANAGERS), updateTitleTransfer);

module.exports = router;
