const db = require('../db');
const { Prisma } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_UNIT_STATUSES, MANUAL_UNIT_STATUSES, MAX_BULK_UNITS } = require('../utils/constants');
const { isPositiveInteger } = require('../utils/money');

/**
 * Calculate area and basePrice from dimensions using decimal-safe math (BUG-003).
 * Server is always the source of truth — never trust client-calculated values.
 * area stays a Prisma.Decimal (physical dimension in sq. ft.); basePrice is
 * rounded to a whole-rupee Int since all money fields are integer-only.
 */
function calcPricing(width, length, pricePerSqFt) {
  const area = new Prisma.Decimal(width).times(length);
  const basePrice = Math.round(area.times(pricePerSqFt).toNumber());
  return { area, basePrice };
}

/**
 * Validate a single unit's create-shape fields. Shared by createUnit and the
 * bulk endpoint so both enforce identical rules instead of drifting.
 * Returns an error string, or null if the row is valid.
 */
function validateUnitInput({ unitNumber, width, length, pricePerSqFt, floor }) {
  if (!unitNumber || !unitNumber.trim()) return 'unitNumber is required';
  if (width == null || isNaN(Number(width)) || Number(width) <= 0) {
    return 'width must be a positive number';
  }
  if (length == null || isNaN(Number(length)) || Number(length) <= 0) {
    return 'length must be a positive number';
  }
  if (pricePerSqFt == null || !isPositiveInteger(pricePerSqFt)) {
    return 'pricePerSqFt must be a positive whole number';
  }
  if (floor !== undefined && floor !== null && floor !== '' && !Number.isInteger(Number(floor))) {
    return 'floor must be a whole number';
  }
  return null;
}

/**
 * floor/unitType are optional on every unit-creation path. Normalizes both to
 * either a clean value or null so callers can spread the result straight into
 * a Prisma `data` object.
 */
function normalizeOptionalUnitFields({ floor, unitType }) {
  return {
    floor: floor !== undefined && floor !== null && floor !== '' ? parseInt(floor, 10) : null,
    unitType: unitType && unitType.trim() ? unitType.trim() : null,
  };
}

// ─── POST /api/units ──────────────────────────────────────────────────────────

const createUnit = async (req, res, next) => {
  try {
    const { projectId, unitNumber, width, length, pricePerSqFt, floor, unitType } = req.body;
    const companyId = req.user.companyId;

    if (!projectId) return sendError(res, 'projectId is required', 400);
    const validationError = validateUnitInput({ unitNumber, width, length, pricePerSqFt, floor });
    if (validationError) return sendError(res, validationError, 400);

    // Verify project belongs to this company
    const project = await db.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) return sendError(res, 'Project not found in your company', 404);

    const { area, basePrice } = calcPricing(width, length, pricePerSqFt);

    const unit = await db.unit.create({
      data: {
        projectId,
        unitNumber: unitNumber.trim(),
        ...normalizeOptionalUnitFields({ floor, unitType }),
        width: new Prisma.Decimal(width),
        length: new Prisma.Decimal(length),
        area,
        pricePerSqFt: Number(pricePerSqFt),
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

// ─── POST /api/units/bulk ─────────────────────────────────────────────────────
// Creates many units in one project in a single atomic operation. Each row is
// validated with the exact same rules as the single-unit endpoint (BUG-parity
// via validateUnitInput) — the only new checks are array-shape, in-payload
// duplicate unitNumbers, and pre-existing unitNumbers already in the project.

const bulkCreateUnits = async (req, res, next) => {
  try {
    const { projectId, units } = req.body;
    const companyId = req.user.companyId;

    if (!projectId) return sendError(res, 'projectId is required', 400);
    if (!Array.isArray(units) || units.length === 0) {
      return sendError(res, 'units must be a non-empty array', 400);
    }
    if (units.length > MAX_BULK_UNITS) {
      return sendError(res, `Cannot create more than ${MAX_BULK_UNITS} units at once`, 400);
    }

    const project = await db.project.findFirst({ where: { id: projectId, companyId } });
    if (!project) return sendError(res, 'Project not found in your company', 404);

    // Validate every row up front and collect ALL errors (not just the first)
    // so the admin can fix everything in one pass instead of one round-trip per row.
    const rowErrors = [];
    const seenNumbers = new Set();
    units.forEach((unit, index) => {
      const error = validateUnitInput(unit);
      if (error) {
        rowErrors.push({ index, unitNumber: unit?.unitNumber ?? null, message: error });
        return;
      }
      const trimmed = unit.unitNumber.trim();
      if (seenNumbers.has(trimmed)) {
        rowErrors.push({ index, unitNumber: trimmed, message: 'Duplicate unit number in this batch' });
      }
      seenNumbers.add(trimmed);
    });

    if (rowErrors.length) {
      return sendError(res, 'One or more units are invalid', 400, { errors: rowErrors });
    }

    // Check against unit numbers that already exist in this project.
    const existing = await db.unit.findMany({
      where: { projectId, unitNumber: { in: Array.from(seenNumbers) } },
      select: { unitNumber: true },
    });
    if (existing.length) {
      return sendError(
        res,
        `Unit number(s) already exist in this project: ${existing.map((u) => u.unitNumber).join(', ')}`,
        409
      );
    }

    const data = units.map((unit) => {
      const { area, basePrice } = calcPricing(unit.width, unit.length, unit.pricePerSqFt);
      return {
        projectId,
        unitNumber: unit.unitNumber.trim(),
        ...normalizeOptionalUnitFields({ floor: unit.floor, unitType: unit.unitType }),
        width: new Prisma.Decimal(unit.width),
        length: new Prisma.Decimal(unit.length),
        area,
        pricePerSqFt: Number(unit.pricePerSqFt),
        basePrice,
      };
    });

    // Atomic — either every unit is created, or none are (a mid-batch failure
    // must not leave a partially-generated floor range behind).
    const createdUnits = await db.$transaction(
      data.map((unitData) =>
        db.unit.create({
          data: unitData,
          include: { project: { select: { id: true, name: true, location: true } } },
        })
      )
    );

    return sendSuccess(res, 'Units created', { units: createdUnits, count: createdUnits.length }, 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 'One or more unit numbers already exist in this project', 409);
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
    const { unitNumber, width, length, pricePerSqFt, floor, unitType } = req.body;
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
    if (pricePerSqFt !== undefined && !isPositiveInteger(pricePerSqFt)) {
      return sendError(res, 'pricePerSqFt must be a positive whole number', 400);
    }
    if (floor !== undefined && floor !== null && floor !== '' && !Number.isInteger(Number(floor))) {
      return sendError(res, 'floor must be a whole number', 400);
    }

    const updateData = {};
    if (unitNumber !== undefined) updateData.unitNumber = unitNumber.trim();
    if (floor !== undefined || unitType !== undefined) {
      Object.assign(updateData, normalizeOptionalUnitFields({
        floor: floor !== undefined ? floor : existing.floor,
        unitType: unitType !== undefined ? unitType : existing.unitType,
      }));
    }

    // Recalculate if any dimension changes (decimal-safe — BUG-003)
    const newWidth = width !== undefined ? width : existing.width;
    const newLength = length !== undefined ? length : existing.length;
    const newPricePerSqFt =
      pricePerSqFt !== undefined ? pricePerSqFt : existing.pricePerSqFt;

    if (width !== undefined || length !== undefined || pricePerSqFt !== undefined) {
      const { area, basePrice } = calcPricing(newWidth, newLength, newPricePerSqFt);
      updateData.width = new Prisma.Decimal(newWidth);
      updateData.length = new Prisma.Decimal(newLength);
      updateData.pricePerSqFt = Number(newPricePerSqFt);
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

module.exports = { createUnit, bulkCreateUnits, listUnits, getUnit, updateUnit, updateUnitStatus };
