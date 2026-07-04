const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { VALID_TITLE_TRANSFER_STATUSES } = require('../utils/constants');

// ── Shared include ────────────────────────────────────────────────────────────
const TITLE_TRANSFER_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
};

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ─── POST /api/bookings/:id/title-transfer ────────────────────────────────────
// Creates the TitleTransfer record. Returns 409 if one already exists.

const createTitleTransfer = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const { notes } = req.body;

    // Enforce @unique — one record per booking
    const existing = await db.titleTransfer.findUnique({ where: { bookingId: booking.id } });
    if (existing) {
      return sendError(
        res,
        'Title transfer record already exists for this booking. Use PATCH to update.',
        409
      );
    }

    const titleTransfer = await db.titleTransfer.create({
      data: {
        bookingId: booking.id,
        companyId,
        status: 'NOT_STARTED',
        ...(notes?.trim() && { notes: notes.trim() }),
        createdById: req.user.id,
      },
      include: TITLE_TRANSFER_INCLUDE,
    });

    return sendSuccess(res, 'Title transfer record created', { titleTransfer }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/title-transfer ─────────────────────────────────────

const getTitleTransfer = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const titleTransfer = await db.titleTransfer.findUnique({
      where: { bookingId: booking.id },
      include: TITLE_TRANSFER_INCLUDE,
    });

    return sendSuccess(res, 'Title transfer retrieved', { titleTransfer: titleTransfer || null });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/title-transfer ───────────────────────────────────
// Setting status = COMPLETED sets completedAt = now() unless caller provides an explicit completedAt.

const updateTitleTransfer = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const existing = await db.titleTransfer.findUnique({ where: { bookingId: booking.id } });
    if (!existing) {
      return sendError(res, 'Title transfer record not found. Use POST to create it first.', 404);
    }

    const { status, completedAt, notes } = req.body;

    if (status !== undefined && !VALID_TITLE_TRANSFER_STATUSES.includes(status)) {
      return sendError(
        res,
        `status must be one of: ${VALID_TITLE_TRANSFER_STATUSES.join(', ')}`,
        400
      );
    }

    const data = {};

    if (status !== undefined) data.status = status;

    if (notes !== undefined) data.notes = notes?.trim() || null;

    // Handle completedAt:
    //   COMPLETED → use provided completedAt or default to now()
    //   Other statuses → clear completedAt
    if (status === 'COMPLETED') {
      if (completedAt) {
        const parsed = new Date(completedAt);
        if (isNaN(parsed.getTime())) {
          return sendError(res, 'completedAt must be a valid date', 400);
        }
        data.completedAt = parsed;
      } else {
        data.completedAt = new Date();
      }
    } else if (status !== undefined && status !== 'COMPLETED') {
      data.completedAt = null;
    }

    const titleTransfer = await db.titleTransfer.update({
      where: { id: existing.id },
      data,
      include: TITLE_TRANSFER_INCLUDE,
    });

    return sendSuccess(res, 'Title transfer updated', { titleTransfer });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTitleTransfer, getTitleTransfer, updateTitleTransfer };
