const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const fs = require('fs');
const path = require('path');

const VALID_DOCUMENT_TYPES = [
  'BOOKING_FORM',
  'SIGNED_AGREEMENT',
  'ID_PROOF',
  'PAYMENT_PROOF',
  'OTHER',
];

// ─── POST /api/bookings/:id/documents ────────────────────────────────────────

const uploadDocument = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!booking) {
      // Clean up the uploaded file if booking not found
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return sendError(res, 'Booking not found', 404);
    }

    if (!req.file) return sendError(res, 'File is required', 400);

    const { type } = req.body;
    if (!type) return sendError(res, 'type is required', 400);
    if (!VALID_DOCUMENT_TYPES.includes(type)) {
      return sendError(res, `type must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`, 400);
    }

    // Build the relative URL path served by express.static
    const fileUrl = `/uploads/bookings/${path.basename(req.file.path)}`;

    const document = await db.bookingDocument.create({
      data: {
        bookingId: booking.id,
        type,
        fileName: req.file.originalname,
        fileUrl,
        uploadedById: req.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Document uploaded', { document }, 201);
  } catch (err) {
    // Clean up file on DB error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
};

// ─── GET /api/bookings/:id/documents ─────────────────────────────────────────

const listDocuments = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!booking) return sendError(res, 'Booking not found', 404);

    const items = await db.bookingDocument.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, 'Documents retrieved', { items });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/bookings/:id/documents/:documentId ──────────────────────────

const deleteDocument = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!booking) return sendError(res, 'Booking not found', 404);

    const document = await db.bookingDocument.findFirst({
      where: {
        id: req.params.documentId,
        bookingId: booking.id,
      },
    });
    if (!document) return sendError(res, 'Document not found', 404);

    await db.bookingDocument.delete({ where: { id: document.id } });

    // Delete the file from disk (best-effort — don't fail if file already gone)
    const filePath = path.join(process.cwd(), document.fileUrl);
    fs.unlink(filePath, (err) => {
      if (err) console.warn('[FILE DELETE]', err.message);
    });

    return sendSuccess(res, 'Document deleted', {});
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, listDocuments, deleteDocument };
