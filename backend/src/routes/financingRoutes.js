const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getFinancing,
  createFinancing,
  updateFinancing,
  syncFinancingErp,
} = require('../controllers/financingController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];
const ADMIN_ONLY = ['ADMIN'];

// GET   /api/bookings/:id/financing          — get (or null) the financing record
// POST  /api/bookings/:id/financing          — create the financing record (409 if already exists)
// PATCH /api/bookings/:id/financing          — update any field(s)
// POST  /api/bookings/:id/financing/erp-sync — push financing to ERP (ADMIN only)

router.get('/', authenticate, authorize(...CRM), getFinancing);
router.post('/', authenticate, authorize(...MANAGERS), createFinancing);
router.patch('/', authenticate, authorize(...MANAGERS), updateFinancing);
router.post('/erp-sync', authenticate, authorize(...ADMIN_ONLY), syncFinancingErp);

module.exports = router;
