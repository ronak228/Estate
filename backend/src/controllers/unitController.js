const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');

const VALID_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD'];

/**
 * Calculate area and basePrice from dimensions.
 * Server is always the source of truth — never trust client-calculated values.
 */
function calcPricing(width, length, pricePerSqFt) {
  const area = Number(width) * Number(length);
  const basePrice = area * Number(pricePerSqFt);
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
        width: Number(width),
        length: Number(length),
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

// ─── GET /api/units ───────────────────────────────────────────────────────────

const listUnits = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const companyId = req.user.companyId;

    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const where = { project: { companyId } };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const items = await db.unit.findMany({
      where,
      orderBy: [{ projectId: 'asc' }, { unitNumber: 'asc' }],
      include: {
        project: { select: { id: true, name: true, location: true } },
      },
    });

    return sendSuccess(res, 'Units retrieved', { items });
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

    // Recalculate if any dimension changes
    const newWidth = width !== undefined ? Number(width) : Number(existing.width);
    const newLength = length !== undefined ? Number(length) : Number(existing.length);
    const newPricePerSqFt =
      pricePerSqFt !== undefined ? Number(pricePerSqFt) : Number(existing.pricePerSqFt);

    if (width !== undefined || length !== undefined || pricePerSqFt !== undefined) {
      const { area, basePrice } = calcPricing(newWidth, newLength, newPricePerSqFt);
      updateData.width = newWidth;
      updateData.length = newLength;
      updateData.pricePerSqFt = newPricePerSqFt;
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

const updateUnitStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const companyId = req.user.companyId;

    if (!status) return sendError(res, 'status is required', 400);
    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const existing = await db.unit.findFirst({
      where: { id: req.params.id, project: { companyId } },
    });
    if (!existing) return sendError(res, 'Unit not found', 404);

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
