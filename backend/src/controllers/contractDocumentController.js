const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { VALID_CONTRACT_DOCUMENT_TYPES, VALID_SIGNATURE_STATUSES } = require('../utils/constants');
const fs = require('fs');
const path = require('path');

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ─── POST /api/bookings/:id/contract-documents ───────────────────────────────

const uploadContractDocument = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return sendError(res, 'Booking not found', 404);
    }

    if (!req.file) return sendError(res, 'File is required', 400);

    const { type } = req.body;
    if (!type) return sendError(res, 'type is required', 400);
    if (!VALID_CONTRACT_DOCUMENT_TYPES.includes(type)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return sendError(res, `type must be one of: ${VALID_CONTRACT_DOCUMENT_TYPES.join(', ')}`, 400);
    }

    const fileUrl = `/uploads/contracts/${path.basename(req.file.path)}`;

    const contractDocument = await db.contractDocument.create({
      data: {
        bookingId: booking.id,
        companyId,
        type,
        fileName: req.file.originalname,
        fileUrl,
        uploadedById: req.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Contract document uploaded', { contractDocument }, 201);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

// ─── GET /api/bookings/:id/contract-documents ────────────────────────────────

const listContractDocuments = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const items = await db.contractDocument.findMany({
      where: { bookingId: booking.id, companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Contract documents retrieved', { items });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/contract-documents/:documentId/signature ────────

const updateSignatureStatus = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const { signatureStatus, signedAt } = req.body;
    if (!signatureStatus) return sendError(res, 'signatureStatus is required', 400);
    if (!VALID_SIGNATURE_STATUSES.includes(signatureStatus)) {
      return sendError(res, `signatureStatus must be one of: ${VALID_SIGNATURE_STATUSES.join(', ')}`, 400);
    }

    const existing = await db.contractDocument.findFirst({
      where: { id: req.params.documentId, bookingId: booking.id, companyId },
    });
    if (!existing) return sendError(res, 'Contract document not found', 404);

    // Determine signedAt:
    //   SIGNED  → use provided signedAt or default to now()
    //   PENDING | REJECTED → clear signedAt
    let resolvedSignedAt = null;
    if (signatureStatus === 'SIGNED') {
      if (signedAt) {
        const parsed = new Date(signedAt);
        if (isNaN(parsed.getTime())) return sendError(res, 'signedAt must be a valid date', 400);
        resolvedSignedAt = parsed;
      } else {
        resolvedSignedAt = new Date();
      }
    }

    const contractDocument = await db.contractDocument.update({
      where: { id: existing.id },
      data: { signatureStatus, signedAt: resolvedSignedAt },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Signature status updated', { contractDocument });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/bookings/:id/contract-documents/:documentId ─────────────────

const deleteContractDocument = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const document = await db.contractDocument.findFirst({
      where: { id: req.params.documentId, bookingId: booking.id, companyId },
    });
    if (!document) return sendError(res, 'Contract document not found', 404);

    await db.contractDocument.delete({ where: { id: document.id } });

    // Remove file from disk (best-effort — don't fail if file already gone)
    const filePath = path.join(process.cwd(), document.fileUrl);
    fs.unlink(filePath, (err) => {
      if (err) console.warn('[FILE DELETE]', err.message);
    });

    return sendSuccess(res, 'Contract document deleted', {});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadContractDocument,
  listContractDocuments,
  updateSignatureStatus,
  deleteContractDocument,
};
