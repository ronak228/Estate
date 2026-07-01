const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createInquiry,
  listInquiries,
  getInquiry,
  updateInquiry,
  assignInquiry,
  changeStage,
  qualifyInquiry,
  createFollowUp,
  updateFollowUp,
  getActivities,
  getAssignableUsers,
  getProjects,
  getBrokers,
} = require('../controllers/inquiryController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// ─── Meta / reference data (register before /:id to avoid shadowing) ─────────
router.get('/meta/users', authenticate, authorize(...CRM), getAssignableUsers);
router.get('/meta/projects', authenticate, authorize(...CRM), getProjects);
router.get('/meta/brokers', authenticate, authorize(...CRM), getBrokers);

// ─── Inquiry CRUD ─────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(...CRM), createInquiry);
router.get('/', authenticate, authorize(...CRM), listInquiries);
router.get('/:id', authenticate, authorize(...CRM), getInquiry);
router.put('/:id', authenticate, authorize(...CRM), updateInquiry);

// ─── Stage & Assignment ───────────────────────────────────────────────────────
router.patch('/:id/assign', authenticate, authorize(...MANAGERS), assignInquiry);
router.patch('/:id/stage', authenticate, authorize(...CRM), changeStage);
router.patch('/:id/qualify', authenticate, authorize(...CRM), qualifyInquiry);

// ─── Follow-ups ───────────────────────────────────────────────────────────────
router.post('/:id/follow-ups', authenticate, authorize(...CRM), createFollowUp);
router.patch('/:id/follow-ups/:followUpId', authenticate, authorize(...CRM), updateFollowUp);

// ─── Activity Timeline ────────────────────────────────────────────────────────
router.get('/:id/activities', authenticate, authorize(...CRM), getActivities);

module.exports = router;
