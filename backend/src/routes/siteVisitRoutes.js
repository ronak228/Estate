const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createSiteVisit,
  listSiteVisits,
  getSiteVisit,
  updateSiteVisit,
  completeSiteVisit,
} = require('../controllers/siteVisitController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.post('/', authenticate, authorize(...CRM), createSiteVisit);
router.get('/', authenticate, authorize(...CRM), listSiteVisits);
router.get('/:id', authenticate, authorize(...CRM), getSiteVisit);
router.put('/:id', authenticate, authorize(...CRM), updateSiteVisit);
// Module 3 — complete a site visit (sets status = COMPLETED, logs activity)
router.patch('/:id/complete', authenticate, authorize(...CRM), completeSiteVisit);

module.exports = router;
