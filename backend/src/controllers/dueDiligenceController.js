const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { VALID_DUE_DILIGENCE_STATUSES } = require('../utils/constants');

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ── Shared include ────────────────────────────────────────────────────────────
const DUE_DILIGENCE_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
};

// ── Status field validation helper ────────────────────────────────────────────
const validateDueDiligenceBody = (body) => {
  const {
    inspectionStatus,
    appraisalStatus,
    legalVerificationStatus,
  } = body;

  if (inspectionStatus !== undefined && !VALID_DUE_DILIGENCE_STATUSES.includes(inspectionStatus)) {
    return `inspectionStatus must be one of: ${VALID_DUE_DILIGENCE_STATUSES.join(', ')}`;
  }
  if (appraisalStatus !== undefined && !VALID_DUE_DILIGENCE_STATUSES.includes(appraisalStatus)) {
    return `appraisalStatus must be one of: ${VALID_DUE_DILIGENCE_STATUSES.join(', ')}`;
  }
  if (legalVerificationStatus !== undefined && !VALID_DUE_DILIGENCE_STATUSES.includes(legalVerificationStatus)) {
    return `legalVerificationStatus must be one of: ${VALID_DUE_DILIGENCE_STATUSES.join(', ')}`;
  }
  return null;
};

// ─── GET /api/bookings/:id/due-diligence ─────────────────────────────────────

const getDueDiligence = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const dueDiligence = await db.dueDiligence.findUnique({
      where: { bookingId: booking.id },
      include: DUE_DILIGENCE_INCLUDE,
    });

    // Return null data when no record yet — callers use POST to create it
    return sendSuccess(res, 'Due diligence retrieved', { dueDiligence: dueDiligence || null });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/due-diligence ────────────────────────────────────

const createDueDiligence = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    // Validate enum fields if provided
    const validationError = validateDueDiligenceBody(req.body);
    if (validationError) return sendError(res, validationError, 400);

    const {
      inspectionStatus,
      inspectionNotes,
      appraisalStatus,
      appraisalNotes,
      legalVerificationStatus,
      legalVerificationNotes,
    } = req.body;

    // Enforce @unique — one record per booking
    const existing = await db.dueDiligence.findUnique({ where: { bookingId: booking.id } });
    if (existing) {
      return sendError(res, 'Due diligence record already exists for this booking. Use PATCH to update.', 409);
    }

    const dueDiligence = await db.dueDiligence.create({
      data: {
        bookingId: booking.id,
        companyId,
        createdById: req.user.id,
        ...(inspectionStatus && { inspectionStatus }),
        ...(inspectionNotes !== undefined && { inspectionNotes }),
        ...(appraisalStatus && { appraisalStatus }),
        ...(appraisalNotes !== undefined && { appraisalNotes }),
        ...(legalVerificationStatus && { legalVerificationStatus }),
        ...(legalVerificationNotes !== undefined && { legalVerificationNotes }),
      },
      include: DUE_DILIGENCE_INCLUDE,
    });

    return sendSuccess(res, 'Due diligence record created', { dueDiligence }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/due-diligence ───────────────────────────────────

const updateDueDiligence = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    // Validate enum fields if provided
    const validationError = validateDueDiligenceBody(req.body);
    if (validationError) return sendError(res, validationError, 400);

    const existing = await db.dueDiligence.findUnique({
      where: { bookingId: booking.id },
    });
    if (!existing) {
      return sendError(res, 'Due diligence record not found. Use POST to create it first.', 404);
    }

    const {
      inspectionStatus,
      inspectionNotes,
      appraisalStatus,
      appraisalNotes,
      legalVerificationStatus,
      legalVerificationNotes,
    } = req.body;

    const dueDiligence = await db.dueDiligence.update({
      where: { id: existing.id },
      data: {
        ...(inspectionStatus !== undefined && { inspectionStatus }),
        ...(inspectionNotes !== undefined && { inspectionNotes }),
        ...(appraisalStatus !== undefined && { appraisalStatus }),
        ...(appraisalNotes !== undefined && { appraisalNotes }),
        ...(legalVerificationStatus !== undefined && { legalVerificationStatus }),
        ...(legalVerificationNotes !== undefined && { legalVerificationNotes }),
      },
      include: DUE_DILIGENCE_INCLUDE,
    });

    return sendSuccess(res, 'Due diligence updated', { dueDiligence });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDueDiligence, createDueDiligence, updateDueDiligence };
