const db = require('../db');
const { Prisma } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/response');
const { VALID_FINANCING_TYPES, VALID_FINANCING_APPROVAL_STATUSES } = require('../utils/constants');
const { syncFinancing } = require('../utils/erpSync');

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ── Shared include ────────────────────────────────────────────────────────────
const FINANCING_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
};

// ─── GET /api/bookings/:id/financing ─────────────────────────────────────────

const getFinancing = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const financing = await db.financing.findUnique({
      where: { bookingId: booking.id },
      include: FINANCING_INCLUDE,
    });

    return sendSuccess(res, 'Financing retrieved', { financing: financing || null });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/financing ────────────────────────────────────────

const createFinancing = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const { type, approvalStatus, bankName, loanAmount, notes } = req.body;

    if (!type) return sendError(res, 'type is required', 400);
    if (!VALID_FINANCING_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_FINANCING_TYPES.join(', ')}`, 400);
    }
    if (approvalStatus !== undefined && !VALID_FINANCING_APPROVAL_STATUSES.includes(approvalStatus)) {
      return sendError(res, `approvalStatus must be one of: ${VALID_FINANCING_APPROVAL_STATUSES.join(', ')}`, 400);
    }
    if (loanAmount !== undefined && loanAmount !== null) {
      if (isNaN(Number(loanAmount)) || Number(loanAmount) < 0) {
        return sendError(res, 'loanAmount must be a non-negative number', 400);
      }
    }

    // Enforce @unique — one record per booking
    const existing = await db.financing.findUnique({ where: { bookingId: booking.id } });
    if (existing) {
      return sendError(res, 'Financing record already exists for this booking. Use PATCH to update.', 409);
    }

    const financing = await db.financing.create({
      data: {
        bookingId: booking.id,
        companyId,
        createdById: req.user.id,
        type,
        ...(approvalStatus !== undefined && { approvalStatus }),
        ...(bankName !== undefined && { bankName }),
        ...(loanAmount !== undefined && loanAmount !== null && {
          loanAmount: new Prisma.Decimal(loanAmount),
        }),
        ...(notes !== undefined && { notes }),
      },
      include: FINANCING_INCLUDE,
    });

    return sendSuccess(res, 'Financing record created', { financing }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/financing ───────────────────────────────────────

const updateFinancing = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const existing = await db.financing.findUnique({ where: { bookingId: booking.id } });
    if (!existing) {
      return sendError(res, 'Financing record not found. Use POST to create it first.', 404);
    }

    const { type, approvalStatus, bankName, loanAmount, notes } = req.body;

    if (type !== undefined && !VALID_FINANCING_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_FINANCING_TYPES.join(', ')}`, 400);
    }
    if (approvalStatus !== undefined && !VALID_FINANCING_APPROVAL_STATUSES.includes(approvalStatus)) {
      return sendError(res, `approvalStatus must be one of: ${VALID_FINANCING_APPROVAL_STATUSES.join(', ')}`, 400);
    }
    if (loanAmount !== undefined && loanAmount !== null) {
      if (isNaN(Number(loanAmount)) || Number(loanAmount) < 0) {
        return sendError(res, 'loanAmount must be a non-negative number', 400);
      }
    }

    const financing = await db.financing.update({
      where: { id: existing.id },
      data: {
        ...(type !== undefined && { type }),
        ...(approvalStatus !== undefined && { approvalStatus }),
        ...(bankName !== undefined && { bankName }),
        ...(loanAmount !== undefined && {
          loanAmount: loanAmount !== null ? new Prisma.Decimal(loanAmount) : null,
        }),
        ...(notes !== undefined && { notes }),
      },
      include: FINANCING_INCLUDE,
    });

    return sendSuccess(res, 'Financing updated', { financing });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/financing/erp-sync ───────────────────────────────
// Pushes financing details to ERP. Non-blocking failure pattern matches Module 4.

const syncFinancingErp = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const existing = await db.financing.findUnique({
      where: { bookingId: booking.id },
      include: FINANCING_INCLUDE,
    });
    if (!existing) {
      return sendError(res, 'Financing record not found for this booking', 404);
    }

    try {
      const result = await syncFinancing({
        bookingId: booking.id,
        companyId,
        type: existing.type,
        approvalStatus: existing.approvalStatus,
        bankName: existing.bankName,
        loanAmount: existing.loanAmount ? Number(existing.loanAmount) : null,
      });

      if (!result.success) throw new Error('ERP financing sync returned failure');

      const updated = await db.financing.update({
        where: { id: existing.id },
        data: { erpSyncedAt: new Date() },
        include: FINANCING_INCLUDE,
      });

      return sendSuccess(res, 'ERP sync successful', { financing: updated });
    } catch (erpErr) {
      // ERP failure is non-blocking. Financing record is still valid.
      console.error('[ERP FINANCING SYNC FAILED]', erpErr.message);
      return sendError(res, 'ERP sync failed. Financing record remains valid.', 502);
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getFinancing, createFinancing, updateFinancing, syncFinancingErp };
