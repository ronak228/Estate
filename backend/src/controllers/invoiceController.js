const db = require('../db');
const { Prisma } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_INVOICE_STATUSES } = require('../utils/constants');
const generateInvoicePdf = require('../utils/generateInvoicePdf');

// ── Shared include ────────────────────────────────────────────────────────────
const INVOICE_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  payments: {
    where: { status: 'RECONCILED' },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { paidAt: 'asc' },
  },
};

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ── Invoice number generator ──────────────────────────────────────────────────
// Format: INV-{YYYY}-{zero-padded-5-digit-sequence}
// Sequence is based on the count of existing invoices for this company in the current year.
const generateInvoiceNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await db.invoice.count({
    where: {
      companyId,
      createdAt: { gte: startOfYear, lt: endOfYear },
    },
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `INV-${year}-${sequence}`;
};

// ─── POST /api/bookings/:id/invoices ─────────────────────────────────────────
// Generates a new Invoice row. invoiceNumber is auto-assigned server-side.

const createInvoice = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const { amount, dueDate, notes } = req.body;

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return sendError(res, 'amount must be a positive number', 400);
    }

    let resolvedDueDate = null;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) return sendError(res, 'dueDate must be a valid date', 400);
      resolvedDueDate = parsed;
    }

    const invoiceNumber = await generateInvoiceNumber(companyId);

    const invoice = await db.invoice.create({
      data: {
        bookingId: booking.id,
        companyId,
        invoiceNumber,
        amount: new Prisma.Decimal(amount),
        status: 'DRAFT',
        ...(resolvedDueDate && { dueDate: resolvedDueDate }),
        ...(notes?.trim() && { notes: notes.trim() }),
        createdById: req.user.id,
      },
      include: INVOICE_INCLUDE,
    });

    return sendSuccess(res, 'Invoice created', { invoice }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/invoices ──────────────────────────────────────────

const listInvoices = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const [total, items] = await Promise.all([
      db.invoice.count({ where: { bookingId: booking.id, companyId } }),
      db.invoice.findMany({
        where: { bookingId: booking.id, companyId },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: INVOICE_INCLUDE,
      }),
    ]);

    return sendSuccess(res, 'Invoices retrieved', { items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────

const getInvoice = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const invoice = await db.invoice.findFirst({
      where: { id: req.params.id, companyId },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) return sendError(res, 'Invoice not found', 404);

    return sendSuccess(res, 'Invoice retrieved', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/invoices/:id/pdf ────────────────────────────────────────────────
//
// INTENTIONAL EXCEPTION: Returns binary PDF — not the standard { success, message, data } envelope.
// The frontend's invoiceService uses responseType: 'blob' for this endpoint.
// Do not "fix" this by wrapping in JSON — it is a documented exception matching
// the quotation PDF (Module 3) and booking receipt (Module 4) patterns.

const getInvoicePdf = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const invoice = await db.invoice.findFirst({
      where: { id: req.params.id, companyId },
      include: {
        booking: {
          include: {
            inquiry: {
              select: {
                id: true,
                contact: { select: { id: true, fullName: true, phone: true, email: true, address: true } },
              },
            },
            unit: {
              include: {
                project: { select: { id: true, name: true, location: true } },
              },
            },
          },
        },
        payments: {
          where: { status: 'RECONCILED' },
          orderBy: { paidAt: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!invoice) return sendError(res, 'Invoice not found', 404);

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true },
    });

    const pdfBuffer = await generateInvoicePdf({
      invoice,
      booking: invoice.booking,
      contact: invoice.booking.inquiry?.contact,
      unit: invoice.booking.unit,
      company,
      payments: invoice.payments,
    });

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/invoices/:id/status ──────────────────────────────────────────
// ADMIN/MANAGER manually update invoice status.
// ISSUED → sets issuedAt = now()
// Status transitions are ADMIN-controlled (not auto-computed from payment totals).

const updateInvoiceStatus = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const { status } = req.body;
    if (!status) return sendError(res, 'status is required', 400);
    if (!VALID_INVOICE_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_INVOICE_STATUSES.join(', ')}`, 400);
    }

    const existing = await db.invoice.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return sendError(res, 'Invoice not found', 404);

    const data = { status };

    // Set issuedAt server-side when status transitions to ISSUED
    if (status === 'ISSUED' && !existing.issuedAt) {
      data.issuedAt = new Date();
    }

    const invoice = await db.invoice.update({
      where: { id: existing.id },
      data,
      include: INVOICE_INCLUDE,
    });

    return sendSuccess(res, 'Invoice status updated', { invoice });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoicePdf,
  updateInvoiceStatus,
};
