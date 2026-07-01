const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');

// ─── Shared include ───────────────────────────────────────────────────────────

const NEGOTIATION_INCLUDE = {
  quotation: {
    select: { id: true, totalAmount: true, basePrice: true, decision: true },
  },
  createdBy: { select: { id: true, fullName: true } },
};

// ─── POST /api/negotiations ───────────────────────────────────────────────────

const createNegotiation = async (req, res, next) => {
  try {
    const { inquiryId, quotationId, offeredPrice, discountAmount, notes } = req.body;
    const companyId = req.user.companyId;

    if (!inquiryId) return sendError(res, 'inquiryId is required', 400);
    if (offeredPrice == null || isNaN(Number(offeredPrice)) || Number(offeredPrice) <= 0) {
      return sendError(res, 'offeredPrice must be a positive number', 400);
    }

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    // Verify quotation belongs to this inquiry (if provided)
    if (quotationId) {
      const quotation = await db.quotation.findFirst({
        where: { id: quotationId, inquiryId },
      });
      if (!quotation) return sendError(res, 'Quotation not found for this inquiry', 404);
    }

    const negotiation = await db.negotiation.create({
      data: {
        inquiryId,
        quotationId: quotationId || null,
        offeredPrice: Number(offeredPrice),
        discountAmount: discountAmount != null ? Number(discountAmount) : 0,
        notes: notes?.trim() || null,
        createdById: req.user.id,
      },
      include: NEGOTIATION_INCLUDE,
    });

    // Log activity
    await db.activityLog.create({
      data: {
        inquiryId,
        type: 'STAGE_CHANGED',
        description: `Negotiation offer recorded — Offered: ₹${Number(offeredPrice).toLocaleString('en-IN')}${discountAmount ? `, Discount: ₹${Number(discountAmount).toLocaleString('en-IN')}` : ''}`,
        performedById: req.user.id,
      },
    });

    return sendSuccess(res, 'Negotiation recorded', { negotiation }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/negotiations?inquiryId= ────────────────────────────────────────

const listNegotiations = async (req, res, next) => {
  try {
    const { inquiryId } = req.query;
    const companyId = req.user.companyId;

    if (!inquiryId) return sendError(res, 'inquiryId query parameter is required', 400);

    // Verify inquiry belongs to this company
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    const items = await db.negotiation.findMany({
      where: { inquiryId },
      orderBy: { createdAt: 'desc' },
      include: NEGOTIATION_INCLUDE,
    });

    return sendSuccess(res, 'Negotiations retrieved', { items });
  } catch (err) {
    next(err);
  }
};

module.exports = { createNegotiation, listNegotiations };
