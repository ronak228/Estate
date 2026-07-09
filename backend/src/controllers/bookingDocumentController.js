const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { VALID_DOCUMENT_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');
const { verifyFileSignature } = require('../utils/fileSignature');
const fs = require('fs');
const path = require('path');



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
    if (!type) {
      fs.unlink(req.file.path, () => {});
      return sendError(res, 'type is required', 400);
    }
    if (!VALID_DOCUMENT_TYPES.includes(type)) {
      fs.unlink(req.file.path, () => {});
      return sendError(res, `type must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`, 400);
    }

    // P2-15 fix: the multer fileFilter only checked the client-declared
    // Content-Type header (attacker-controlled); verify the actual file bytes
    // match the declared type before accepting it.
    if (!verifyFileSignature(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return sendError(res, 'File content does not match its declared type', 400);
    }

    // Build the relative URL path — served via the authenticated, tenant-scoped
    // GET /api/bookings/:id/documents/:documentId/download route (NOT express.static).
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
      if (err) logger.warn('Booking document file delete failed (best-effort)', { documentId: document.id, error: err.message });
    });

    return sendSuccess(res, 'Document deleted', {});
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/documents/:documentId/download ────────────────────
//
// Authenticated, tenant-scoped document download (BUG-002).
// Booking documents are NOT served from the public static path anymore; they
// are streamed here only after verifying the booking belongs to the caller's
// company. Returns the raw file (not the JSON envelope).

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const downloadDocument = async (req, res, next) => {
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

    // fileUrl is stored as "/uploads/bookings/<file>" — resolve to disk path.
    const filePath = path.join(process.cwd(), document.fileUrl);
    if (!fs.existsSync(filePath)) return sendError(res, 'File not found on server', 404);

    const ext = path.extname(document.fileName || filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    const safeName = (document.fileName || 'document').replace(/"/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, listDocuments, deleteDocument, downloadDocument };
