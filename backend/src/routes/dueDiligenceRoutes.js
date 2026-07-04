const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  getDueDiligence,
  createDueDiligence,
  updateDueDiligence,
} = require('../controllers/dueDiligenceController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// GET   /api/bookings/:id/due-diligence  — get (or null) the due diligence record for a booking
// POST  /api/bookings/:id/due-diligence  — create the due diligence record (409 if already exists)
// PATCH /api/bookings/:id/due-diligence  — update any field(s) on the existing record

router.get('/', authenticate, authorize(...CRM), getDueDiligence);
router.post('/', authenticate, authorize(...MANAGERS), createDueDiligence);
router.patch('/', authenticate, authorize(...MANAGERS), updateDueDiligence);

module.exports = router;
