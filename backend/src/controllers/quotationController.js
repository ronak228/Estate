const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const generateQuotationPdf = require('../utils/generateQuotationPdf');

// ─── Shared include shape ─────────────────────────────────────────────────────

const QUOTATION_INCLUDE = {
  charges: true,
  unit: {
    include: {
      project: { select: { id: true, name: true, location: true } },
    },
  },
  inquiry: {
    select: {
      id: true,
      stage: true,
      contact: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
};

// ─── POST /api/quotations ─────────────────────────────────────────────────────

const createQuotation = async (req, res, next) => {
  try {
    const { inquiryId, unitId, charges = [], validUntil } = req.body;
    const companyId = req.user.companyId;

    if (!inquiryId) return sendError(res, 'inquiryId is required', 400);
    if (!unitId) return sendError(res, 'unitId is required', 400);

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    // Verify unit belongs to a project in this company
    const unit = await db.unit.findFirst({
      where: { id: unitId, project: { companyId } },
    });
    if (!unit) return sendError(res, 'Unit not found', 404);

    // Validate charges array
    if (!Array.isArray(charges)) {
      return sendError(res, 'charges must be an array', 400);
    }
    for (const c of charges) {
      if (!c.label || c.label.toString().trim() === '') {
        return sendError(res, 'Each charge must have a label', 400);
      }
      if (c.amount == null || isNaN(Number(c.amount)) || Number(c.amount) < 0) {
        return sendError(res, `Charge "${c.label}" has an invalid amount`, 400);
      }
    }

    // Snapshot basePrice from unit at creation time — never re-read live afterward
    const basePrice = Number(unit.basePrice);
    const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalAmount = basePrice + chargesTotal;

    const validUntilDate = validUntil ? new Date(validUntil) : undefined;
    if (validUntil && isNaN(validUntilDate?.getTime())) {
      return sendError(res, 'validUntil must be a valid date', 400);
    }

    const quotation = await db.quotation.create({
      data: {
        inquiryId,
        unitId,
        basePrice,
        totalAmount,
        validUntil: validUntilDate || null,
        createdById: req.user.id,
        charges: {
          create: charges.map((c) => ({
            label: c.label.trim(),
            amount: Number(c.amount),
          })),
        },
      },
      include: QUOTATION_INCLUDE,
    });

    // Log activity on the inquiry
    await db.activityLog.create({
      data: {
        inquiryId,
        type: 'STAGE_CHANGED',
        description: `Quotation created for Unit ${unit.unitNumber} — Total: ₹${totalAmount.toLocaleString('en-IN')}`,
        performedById: req.user.id,
      },
    });

    return sendSuccess(res, 'Quotation created', { quotation }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/quotations ──────────────────────────────────────────────────────

const listQuotations = async (req, res, next) => {
  try {
    const { inquiryId, decision, page = 1, pageSize = 20 } = req.query;
    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {
      inquiry: { companyId },
    };

    if (inquiryId) where.inquiryId = inquiryId;
    if (decision) where.decision = decision;

    const [total, items] = await Promise.all([
      db.quotation.count({ where }),
      db.quotation.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
        include: QUOTATION_INCLUDE,
      }),
    ]);

    return sendSuccess(res, 'Quotations retrieved', {
      items,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/quotations/:id ──────────────────────────────────────────────────

const getQuotation = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const quotation = await db.quotation.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: QUOTATION_INCLUDE,
    });

    if (!quotation) return sendError(res, 'Quotation not found', 404);

    return sendSuccess(res, 'Quotation retrieved', { quotation });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/quotations/:id/pdf ──────────────────────────────────────────────
//
// INTENTIONAL EXCEPTION: This endpoint does NOT use the standard
// { success, message, data } JSON envelope. It streams a binary PDF file
// directly to the client. This is by design — do NOT "fix" it to return JSON.
//
// The frontend's quotationService handles this endpoint separately using
// responseType: 'blob' rather than the normal JSON unwrap.

const getQuotationPdf = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const quotation = await db.quotation.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: {
        charges: true,
        unit: {
          include: {
            project: { select: { id: true, name: true, location: true } },
          },
        },
        inquiry: {
          select: {
            id: true,
            contact: { select: { id: true, fullName: true, phone: true, email: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!quotation) return sendError(res, 'Quotation not found', 404);

    // Load the company details for the PDF header
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true },
    });

    const pdfBuffer = await generateQuotationPdf({
      quotation,
      charges: quotation.charges,
      unit: quotation.unit,
      contact: quotation.inquiry?.contact,
      company,
      createdBy: quotation.createdBy,
    });

    const filename = `quotation-${quotation.id.slice(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/quotations/:id/decision ──────────────────────────────────────

const updateDecision = async (req, res, next) => {
  try {
    const { decision } = req.body;
    const companyId = req.user.companyId;

    const VALID_DECISIONS = ['PENDING', 'NEGOTIATING', 'ACCEPTED', 'REJECTED'];
    if (!decision) return sendError(res, 'decision is required', 400);
    if (!VALID_DECISIONS.includes(decision)) {
      return sendError(res, `decision must be one of: ${VALID_DECISIONS.join(', ')}`, 400);
    }

    const existing = await db.quotation.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!existing) return sendError(res, 'Quotation not found', 404);

    const [quotation] = await db.$transaction([
      db.quotation.update({
        where: { id: req.params.id },
        data: { decision },
        include: QUOTATION_INCLUDE,
      }),
      db.activityLog.create({
        data: {
          inquiryId: existing.inquiryId,
          type: 'STAGE_CHANGED',
          description: `Quotation decision updated to: ${decision}`,
          performedById: req.user.id,
        },
      }),
    ]);

    return sendSuccess(res, 'Quotation decision updated', { quotation });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuotation,
  listQuotations,
  getQuotation,
  getQuotationPdf,
  updateDecision,
};
