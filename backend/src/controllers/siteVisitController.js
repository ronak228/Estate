const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { MANUAL_SITE_VISIT_STATUSES } = require('../utils/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SITE_VISIT_INCLUDE = {
  inquiry: {
    select: {
      id: true,
      stage: true,
      contact: { select: { id: true, fullName: true, phone: true } },
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      basePrice: true,
      area: true,
      status: true,
      project: { select: { id: true, name: true } },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
};

// ─── POST /api/site-visits ────────────────────────────────────────────────────

const createSiteVisit = async (req, res, next) => {
  try {
    const { inquiryId, unitId, scheduledAt, notes } = req.body;
    const companyId = req.user.companyId;

    if (!inquiryId) return sendError(res, 'inquiryId is required', 400);
    if (!scheduledAt) return sendError(res, 'scheduledAt is required', 400);

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return sendError(res, 'scheduledAt must be a valid date', 400);
    }

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    // Verify unit belongs to a project in this company (if provided)
    if (unitId) {
      const unit = await db.unit.findFirst({
        where: { id: unitId, project: { companyId } },
      });
      if (!unit) return sendError(res, 'Unit not found', 400);

      // Business Rule 4 (BUG-004): only AVAILABLE units may be selected.
      if (unit.status !== 'AVAILABLE') {
        return sendError(res, `Unit is not available (current status: ${unit.status})`, 400);
      }
    }

    const siteVisit = await db.$transaction(async (tx) => {
      const created = await tx.siteVisit.create({
        data: {
          inquiryId,
          unitId: unitId || null,
          scheduledAt: scheduledDate,
          notes: notes?.trim() || null,
          createdById: req.user.id,
          status: 'SCHEDULED',
        },
        include: SITE_VISIT_INCLUDE,
      });

      // Advance inquiry stage to SITE_VISIT_SCHEDULED if it hasn't progressed
      // past that point yet (BUG-020 — site-visit lifecycle drives inquiry stage).
      const STAGES_BEFORE_VISIT = ['NEW', 'CONTACTED', 'QUALIFIED'];
      const inq = await tx.inquiry.findUnique({ where: { id: inquiryId }, select: { stage: true } });
      if (inq && STAGES_BEFORE_VISIT.includes(inq.stage)) {
        await tx.inquiry.update({
          where: { id: inquiryId },
          data: { stage: 'SITE_VISIT_SCHEDULED' },
        });
      }

      return created;
    });

    return sendSuccess(res, 'Site visit scheduled', { siteVisit }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/site-visits ─────────────────────────────────────────────────────

const listSiteVisits = async (req, res, next) => {
  try {
    const { inquiryId, status, from, to } = req.query;
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const where = {
      inquiry: { companyId },
    };

    if (inquiryId) where.inquiryId = inquiryId;
    if (status) where.status = status;

    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }

    const [total, items] = await Promise.all([
      db.siteVisit.count({ where }),
      db.siteVisit.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: SITE_VISIT_INCLUDE,
      }),
    ]);

    return sendSuccess(res, 'Site visits retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/site-visits/:id ─────────────────────────────────────────────────

const getSiteVisit = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const siteVisit = await db.siteVisit.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: SITE_VISIT_INCLUDE,
    });

    if (!siteVisit) return sendError(res, 'Site visit not found', 404);

    return sendSuccess(res, 'Site visit retrieved', { siteVisit });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/site-visits/:id ───────────────────────────────────────────────

const updateSiteVisit = async (req, res, next) => {
  try {
    const { scheduledAt, unitId, notes, status } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.siteVisit.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!existing) return sendError(res, 'Site visit not found', 404);

    // Only SCHEDULED, RESCHEDULED, CANCELLED allowed from this endpoint
    // COMPLETED is set by Module 3 only
    if (status && !MANUAL_SITE_VISIT_STATUSES.includes(status)) {
      return sendError(
        res,
        `status must be one of: ${MANUAL_SITE_VISIT_STATUSES.join(', ')} (COMPLETED is set by the site visit completion flow)`,
        400
      );
    }

    if (unitId) {
      const unit = await db.unit.findFirst({
        where: { id: unitId, project: { companyId } },
      });
      if (!unit) return sendError(res, 'Unit not found', 400);

      // Business Rule 4 (BUG-004): only AVAILABLE units may be selected.
      if (unit.status !== 'AVAILABLE') {
        return sendError(res, `Unit is not available (current status: ${unit.status})`, 400);
      }
    }

    const updateData = {};

    if (scheduledAt !== undefined) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return sendError(res, 'scheduledAt must be a valid date', 400);
      }
      updateData.scheduledAt = scheduledDate;
      // Auto-set status to RESCHEDULED when date changes (unless explicitly set)
      if (!status) {
        updateData.status = 'RESCHEDULED';
      }
    }

    if (unitId !== undefined) updateData.unitId = unitId || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (status) updateData.status = status;

    const siteVisit = await db.siteVisit.update({
      where: { id: req.params.id },
      data: updateData,
      include: SITE_VISIT_INCLUDE,
    });

    return sendSuccess(res, 'Site visit updated', { siteVisit });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/site-visits/:id/complete ─────────────────────────────────────
// Module 3 — marks a site visit as COMPLETED and logs an activity on its inquiry.

const completeSiteVisit = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.siteVisit.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!existing) return sendError(res, 'Site visit not found', 404);

    if (existing.status === 'COMPLETED') {
      return sendError(res, 'Site visit is already completed', 400);
    }

    if (existing.status === 'CANCELLED') {
      return sendError(res, 'Cannot complete a cancelled site visit', 400);
    }

    const updateData = { status: 'COMPLETED' };
    if (notes !== undefined) updateData.notes = notes?.trim() || existing.notes;

    const [siteVisit] = await db.$transaction([
      db.siteVisit.update({
        where: { id: req.params.id },
        data: updateData,
        include: SITE_VISIT_INCLUDE,
      }),
      db.activityLog.create({
        data: {
          inquiryId: existing.inquiryId,
          type: 'SITE_VISIT_COMPLETED',
          description: 'Site visit marked as completed',
          performedById: req.user.id,
        },
      }),
      // Advance inquiry stage to NEGOTIATION when a site visit is completed
      // (if the inquiry is still at SITE_VISIT_SCHEDULED — BUG-020).
      db.inquiry.updateMany({
        where: { id: existing.inquiryId, stage: 'SITE_VISIT_SCHEDULED' },
        data: { stage: 'NEGOTIATION' },
      }),
    ]);

    return sendSuccess(res, 'Site visit completed', { siteVisit });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSiteVisit,
  listSiteVisits,
  getSiteVisit,
  updateSiteVisit,
  completeSiteVisit,
};
