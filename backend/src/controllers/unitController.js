const db = require('../db');
const { Prisma } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_UNIT_STATUSES, MANUAL_UNIT_STATUSES } = require('../utils/constants');

/**
 * Calculate area and basePrice from dimensions using decimal-safe math (BUG-003).
 * Server is always the source of truth — never trust client-calculated values.
 * Returns Prisma.Decimal values so no floating-point rounding is persisted.
 */
function calcPricing(width, length, pricePerSqFt) {
  const area = new Prisma.Decimal(width).times(length);
  const basePrice = area.times(pricePerSqFt);
  return { area, basePrice };
}

// ─── POST /api/units ──────────────────────────────────────────────────────────

const createUnit = async (req, res, next) => {
  try {
    const { projectId, unitNumber, width, length, pricePerSqFt } = req.body;
    const companyId = req.user.companyId;

    if (!projectId) return sendError(res, 'projectId is required', 400);
    if (!unitNumber || !unitNumber.trim()) return sendError(res, 'unitNumber is required', 400);
    if (width == null || isNaN(Number(width)) || Number(width) <= 0) {
      return sendError(res, 'width must be a positive number', 400);
    }
    if (length == null || isNaN(Number(length)) || Number(length) <= 0) {
      return sendError(res, 'length must be a positive number', 400);
    }
    if (pricePerSqFt == null || isNaN(Number(pricePerSqFt)) || Number(pricePerSqFt) <= 0) {
      return sendError(res, 'pricePerSqFt must be a positive number', 400);
    }

    // Verify project belongs to this company
    const project = await db.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) return sendError(res, 'Project not found in your company', 404);

    const { area, basePrice } = calcPricing(width, length, pricePerSqFt);

    const unit = await db.unit.create({
      data: {
        projectId,
        unitNumber: unitNumber.trim(),
        width: new Prisma.Decimal(width),
        length: new Prisma.Decimal(length),
        area,
        pricePerSqFt: new Prisma.Decimal(pricePerSqFt),
        basePrice,
      },
      include: {
        project: { select: { id: true, name: true, location: true } },
      },
    });

    return sendSuccess(res, 'Unit created', { unit }, 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 'Unit number already exists in this project', 409);
    }
    next(err);
  }
};

// ─── GET /api/units ───────────────────────────────────────────────────────────

const listUnits = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const companyId = req.user.companyId;

    if (status && !VALID_UNIT_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_UNIT_STATUSES.join(', ')}`, 400);
    }

    // Paginated (BUG-015): defaults to 100 per page and is hard-capped at 100 to
    // prevent unbounded result sets. Response keeps the `items` array shape.
    const { page, pageSize, skip, take } = getPagination(req.query, { defaultPageSize: 100 });

    const where = { project: { companyId } };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const [total, items] = await Promise.all([
      db.unit.count({ where }),
      db.unit.findMany({
        where,
        skip,
        take,
        orderBy: [{ projectId: 'asc' }, { unitNumber: 'asc' }],
        include: {
          project: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Units retrieved', { items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/units/:id ───────────────────────────────────────────────────────

const getUnit = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const unit = await db.unit.findFirst({
      where: { id: req.params.id, project: { companyId } },
      include: {
        project: { select: { id: true, name: true, location: true, status: true } },
      },
    });

    if (!unit) return sendError(res, 'Unit not found', 404);

    return sendSuccess(res, 'Unit retrieved', { unit });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/units/:id ───────────────────────────────────────────────────────

const updateUnit = async (req, res, next) => {
  try {
    const { unitNumber, width, length, pricePerSqFt } = req.body;
    const companyId = req.user.companyId;

    const existing = await db.unit.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });
    if (!existing) return sendError(res, 'Unit not found', 404);

    if (unitNumber !== undefined && !unitNumber.trim()) {
      return sendError(res, 'unitNumber cannot be empty', 400);
    }
    if (width !== undefined && (isNaN(Number(width)) || Number(width) <= 0)) {
      return sendError(res, 'width must be a positive number', 400);
    }
    if (length !== undefined && (isNaN(Number(length)) || Number(length) <= 0)) {
      return sendError(res, 'length must be a positive number', 400);
    }
    if (pricePerSqFt !== undefined && (isNaN(Number(pricePerSqFt)) || Number(pricePerSqFt) <= 0)) {
      return sendError(res, 'pricePerSqFt must be a positive number', 400);
    }

    const updateData = {};
    if (unitNumber !== undefined) updateData.unitNumber = unitNumber.trim();

    // Recalculate if any dimension changes (decimal-safe — BUG-003)
    const newWidth = width !== undefined ? width : existing.width;
    const newLength = length !== undefined ? length : existing.length;
    const newPricePerSqFt =
      pricePerSqFt !== undefined ? pricePerSqFt : existing.pricePerSqFt;

    if (width !== undefined || length !== undefined || pricePerSqFt !== undefined) {
      const { area, basePrice } = calcPricing(newWidth, newLength, newPricePerSqFt);
      updateData.width = new Prisma.Decimal(newWidth);
      updateData.length = new Prisma.Decimal(newLength);
      updateData.pricePerSqFt = new Prisma.Decimal(newPricePerSqFt);
      updateData.area = area;
      updateData.basePrice = basePrice;
    }

    const unit = await db.unit.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, location: true } },
      },
    });

    return sendSuccess(res, 'Unit updated', { unit });
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 'Unit number already exists in this project', 409);
    }
    next(err);
  }
};

// ─── PATCH /api/units/:id/status ─────────────────────────────────────────────
// Manual status override only — RESERVED is set exclusively by booking transaction.

// Manual endpoint may only toggle AVAILABLE ↔ SOLD (BUG-005). RESERVED is
// reachable/clearable ONLY through the booking / cancellation flows.

const updateUnitStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const companyId = req.user.companyId;

    if (!status) return sendError(res, 'status is required', 400);
    if (!MANUAL_UNIT_STATUSES.includes(status)) {
      return sendError(
        res,
        `status must be one of: ${MANUAL_UNIT_STATUSES.join(', ')} (RESERVED is managed by the booking flow)`,
        400
      );
    }

    const existing = await db.unit.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });
    if (!existing) return sendError(res, 'Unit not found', 404);

    // Block manual changes that would contradict an active booking (BUG-005).
    // A unit backing a CONFIRMED booking must not be manually re-statused —
    // release it through the booking cancellation flow instead.
    const activeBooking = await db.booking.findFirst({
      where: { unitId: existing.id, status: 'CONFIRMED' },
    });
    if (activeBooking) {
      return sendError(
        res,
        'Cannot change status: unit has an active booking. Cancel the booking to release the unit.',
        409
      );
    }

    const unit = await db.unit.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        project: { select: { id: true, name: true, location: true } },
      },
    });

    return sendSuccess(res, 'Unit status updated', { unit });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUnit, listUnits, getUnit, updateUnit, updateUnitStatus };
