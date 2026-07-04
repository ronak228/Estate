const db = require('../db');
const { Prisma } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_PAYMENT_MODES } = require('../utils/constants');

// ── Shared include ────────────────────────────────────────────────────────────
const PAYMENT_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  invoice: { select: { id: true, invoiceNumber: true, amount: true, status: true } },
};

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ─── POST /api/bookings/:id/transaction-payments ─────────────────────────────
// Records a new installment/milestone TransactionPayment against a booking.
// Distinct from Module 4's BookingPayment (booking token) — different business purpose.

const createTransactionPayment = async (req, res, next) => {
  try {
    const { amount, mode, paidAt, referenceNumber } = req.body;
    const companyId = req.user.companyId;

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return sendError(res, 'amount must be a positive number', 400);
    }

    if (!VALID_PAYMENT_MODES.includes(mode)) {
      return sendError(res, `mode must be one of: ${VALID_PAYMENT_MODES.join(', ')}`, 400);
    }

    if (!paidAt) return sendError(res, 'paidAt is required', 400);
    const paidAtDate = new Date(paidAt);
    if (isNaN(paidAtDate.getTime())) {
      return sendError(res, 'paidAt must be a valid date', 400);
    }

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const payment = await db.transactionPayment.create({
      data: {
        bookingId: booking.id,
        companyId,
        amount: new Prisma.Decimal(amount),
        mode,
        paidAt: paidAtDate,
        referenceNumber: referenceNumber?.trim() || null,
        status: 'PENDING',
        createdById: req.user.id,
      },
      include: PAYMENT_INCLUDE,
    });

    return sendSuccess(res, 'Transaction payment recorded', { payment }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/transaction-payments ──────────────────────────────

const listTransactionPayments = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const [total, items] = await Promise.all([
      db.transactionPayment.count({ where: { bookingId: booking.id, companyId } }),
      db.transactionPayment.findMany({
        where: { bookingId: booking.id, companyId },
        skip,
        take,
        orderBy: { paidAt: 'asc' },
        include: PAYMENT_INCLUDE,
      }),
    ]);

    return sendSuccess(res, 'Transaction payments retrieved', { items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/transaction-payments/:id/reconcile ───────────────────────────
// Sets TransactionPayment.invoiceId = invoiceId and status = RECONCILED in one update.
// Does NOT cascade-change Invoice.status — ADMIN updates invoice status separately.
// No partial-amount validation enforced server-side (ERP handles financial accuracy).

const reconcilePayment = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const { invoiceId } = req.body;
    if (!invoiceId) return sendError(res, 'invoiceId is required', 400);

    // Verify the payment belongs to this company
    const existing = await db.transactionPayment.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return sendError(res, 'Transaction payment not found', 404);

    if (existing.status === 'RECONCILED') {
      return sendError(res, 'Payment is already reconciled', 400);
    }

    // Verify the invoice belongs to the same company and same booking
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, companyId, bookingId: existing.bookingId },
    });
    if (!invoice) {
      return sendError(res, 'Invoice not found or does not belong to the same booking', 404);
    }

    const payment = await db.transactionPayment.update({
      where: { id: existing.id },
      data: {
        invoiceId,
        status: 'RECONCILED',
      },
      include: PAYMENT_INCLUDE,
    });

    return sendSuccess(res, 'Payment reconciled', { payment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransactionPayment,
  listTransactionPayments,
  reconcilePayment,
};
