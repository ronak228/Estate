const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const db = require('../db');
const { sendError } = require('../utils/response');
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

/**
 * Ownership guard (BUG-019): SALES_EXECUTIVE may only write to inquiries
 * assigned to themselves. ADMIN/MANAGER bypass this check.
 */
const requireAssignedTo = async (req, res, next) => {
  if (req.user.role !== 'SALES_EXECUTIVE') return next();
  const inquiry = await db.inquiry.findFirst({
    where: { id: req.params.id, companyId: req.user.companyId },
    select: { assignedToId: true },
  });
  if (!inquiry) return sendError(res, 'Inquiry not found', 404);
  if (inquiry.assignedToId !== req.user.id) {
    return sendError(res, 'You can only modify inquiries assigned to you', 403);
  }
  next();
};

// ─── Meta / reference data (register before /:id to avoid shadowing) ─────────
router.get('/meta/users', authenticate, authorize(...CRM), getAssignableUsers);
router.get('/meta/projects', authenticate, authorize(...CRM), getProjects);
router.get('/meta/brokers', authenticate, authorize(...CRM), getBrokers);

// ─── Inquiry CRUD ─────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(...CRM), createInquiry);
router.get('/', authenticate, authorize(...CRM), listInquiries);
router.get('/:id', authenticate, authorize(...CRM), getInquiry);
router.put('/:id', authenticate, authorize(...CRM), requireAssignedTo, updateInquiry);

// ─── Stage & Assignment ───────────────────────────────────────────────────────
router.patch('/:id/assign', authenticate, authorize(...MANAGERS), assignInquiry);
router.patch('/:id/stage', authenticate, authorize(...CRM), requireAssignedTo, changeStage);
router.patch('/:id/qualify', authenticate, authorize(...CRM), requireAssignedTo, qualifyInquiry);

// ─── Follow-ups ───────────────────────────────────────────────────────────────
router.post('/:id/follow-ups', authenticate, authorize(...CRM), requireAssignedTo, createFollowUp);
router.patch('/:id/follow-ups/:followUpId', authenticate, authorize(...CRM), requireAssignedTo, updateFollowUp);

// ─── Activity Timeline ────────────────────────────────────────────────────────
router.get('/:id/activities', authenticate, authorize(...CRM), getActivities);

module.exports = router;
