const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { MANUAL_SITE_VISIT_STATUSES } = require('../utils/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// unit pricing is intentionally omitted here — visit scheduling doesn't need
// it, and floor/unitType/area/status are what an admin needs to tell units apart.
const SITE_VISIT_INCLUDE = {
  inquiry: {
    select: {
      id: true,
      stage: true,
      projectId: true,
      contact: { select: { id: true, fullName: true, phone: true } },
    },
  },
  units: {
    select: {
      unit: {
        select: {
          id: true,
          unitNumber: true,
          floor: true,
          unitType: true,
          area: true,
          status: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
};

// Flattens the SiteVisitUnit join rows into a plain `units: Unit[]` array so
// callers don't have to know about the join table shape.
function formatSiteVisit(siteVisit) {
  if (!siteVisit) return siteVisit;
  return { ...siteVisit, units: siteVisit.units.map((su) => su.unit) };
}

/**
 * Validates and dedupes a candidate unitIds array for a site visit. Shared by
 * create and update so both enforce the same "AVAILABLE units only" rule
 * (BUG-004) across every unit in the batch, not just a single one.
 * Returns { ids } on success or { error } on failure.
 */
async function resolveUnitIds(unitIds, companyId) {
  if (!Array.isArray(unitIds) || unitIds.length === 0) return { ids: [] };

  const uniqueIds = Array.from(new Set(unitIds));
  const units = await db.unit.findMany({
    where: { id: { in: uniqueIds }, project: { companyId } },
  });
  if (units.length !== uniqueIds.length) {
    return { error: 'One or more units were not found in your company' };
  }

  const notAvailable = units.filter((u) => u.status !== 'AVAILABLE');
  if (notAvailable.length) {
    return { error: `Unit(s) not available: ${notAvailable.map((u) => u.unitNumber).join(', ')}` };
  }

  return { ids: uniqueIds };
}

// ─── POST /api/site-visits ────────────────────────────────────────────────────

const createSiteVisit = async (req, res, next) => {
  try {
    const { inquiryId, unitIds, scheduledAt, notes } = req.body;
    const companyId = req.user.companyId;

    if (!inquiryId) return sendError(res, 'inquiryId is required', 400);
    if (!scheduledAt) return sendError(res, 'scheduledAt is required', 400);
    if (unitIds !== undefined && !Array.isArray(unitIds)) {
      return sendError(res, 'unitIds must be an array of unit ids', 400);
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return sendError(res, 'scheduledAt must be a valid date', 400);
    }

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    // A customer may be interested in several units of the same property
    // before deciding — validate every candidate, not just one.
    const { ids: resolvedUnitIds, error: unitError } = await resolveUnitIds(unitIds, companyId);
    if (unitError) return sendError(res, unitError, 400);

    const siteVisit = await db.$transaction(async (tx) => {
      const created = await tx.siteVisit.create({
        data: {
          inquiryId,
          scheduledAt: scheduledDate,
          notes: notes?.trim() || null,
          createdById: req.user.id,
          status: 'SCHEDULED',
          units: { create: resolvedUnitIds.map((unitId) => ({ unitId })) },
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

    return sendSuccess(res, 'Site visit scheduled', { siteVisit: formatSiteVisit(siteVisit) }, 201);
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
      items: items.map(formatSiteVisit),
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

    return sendSuccess(res, 'Site visit retrieved', { siteVisit: formatSiteVisit(siteVisit) });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/site-visits/:id ───────────────────────────────────────────────

const updateSiteVisit = async (req, res, next) => {
  try {
    const { scheduledAt, unitIds, notes, status } = req.body;
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

    if (unitIds !== undefined && !Array.isArray(unitIds)) {
      return sendError(res, 'unitIds must be an array of unit ids', 400);
    }

    let resolvedUnitIds;
    if (unitIds !== undefined) {
      const { ids, error: unitError } = await resolveUnitIds(unitIds, companyId);
      if (unitError) return sendError(res, unitError, 400);
      resolvedUnitIds = ids;
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

    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (status) updateData.status = status;

    const siteVisit = await db.$transaction(async (tx) => {
      // Replace the interested-units set wholesale when unitIds is provided —
      // simpler and safer than diffing add/remove, and batches are small.
      if (resolvedUnitIds !== undefined) {
        await tx.siteVisitUnit.deleteMany({ where: { siteVisitId: req.params.id } });
        if (resolvedUnitIds.length) {
          await tx.siteVisitUnit.createMany({
            data: resolvedUnitIds.map((unitId) => ({ siteVisitId: req.params.id, unitId })),
          });
        }
      }

      return tx.siteVisit.update({
        where: { id: req.params.id },
        data: updateData,
        include: SITE_VISIT_INCLUDE,
      });
    });

    return sendSuccess(res, 'Site visit updated', { siteVisit: formatSiteVisit(siteVisit) });
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

    return sendSuccess(res, 'Site visit completed', { siteVisit: formatSiteVisit(siteVisit) });
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
