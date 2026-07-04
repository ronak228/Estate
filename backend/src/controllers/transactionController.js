const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_TRANSACTION_STATUSES } = require('../utils/constants');
const { syncTransaction } = require('../utils/erpSync');

// ── Shared include ────────────────────────────────────────────────────────────
const TRANSACTION_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
};

// ── Shared booking ownership check ───────────────────────────────────────────
const findBooking = async (bookingId, companyId) => {
  return db.booking.findFirst({
    where: { id: bookingId, inquiry: { companyId } },
  });
};

// ─── POST /api/bookings/:id/transaction ──────────────────────────────────────
// Initializes the Transaction record for a booking. Returns 409 if one already exists.

const createTransaction = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    // Enforce @unique — one transaction record per booking
    const existing = await db.transaction.findUnique({ where: { bookingId: booking.id } });
    if (existing) {
      return sendError(
        res,
        'Transaction record already exists for this booking. Use PATCH .../status to update.',
        409
      );
    }

    const transaction = await db.transaction.create({
      data: {
        bookingId: booking.id,
        companyId,
        createdById: req.user.id,
        status: 'PENDING',
      },
      include: TRANSACTION_INCLUDE,
    });

    return sendSuccess(res, 'Transaction record created', { transaction }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/transaction ───────────────────────────────────────

const getTransaction = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const transaction = await db.transaction.findUnique({
      where: { bookingId: booking.id },
      include: TRANSACTION_INCLUDE,
    });

    return sendSuccess(res, 'Transaction retrieved', { transaction: transaction || null });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/transaction/status ──────────────────────────────

const updateTransactionStatus = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const { status } = req.body;
    if (!status) return sendError(res, 'status is required', 400);
    if (!VALID_TRANSACTION_STATUSES.includes(status)) {
      return sendError(res, `status must be one of: ${VALID_TRANSACTION_STATUSES.join(', ')}`, 400);
    }

    const existing = await db.transaction.findUnique({ where: { bookingId: booking.id } });
    if (!existing) {
      return sendError(res, 'Transaction record not found. Use POST to initialize it first.', 404);
    }

    const transaction = await db.transaction.update({
      where: { id: existing.id },
      data: { status },
      include: TRANSACTION_INCLUDE,
    });

    return sendSuccess(res, 'Transaction status updated', { transaction });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/transaction/erp-sync ─────────────────────────────
// Calls syncTransaction() with the booking's invoices and payments.
// On success, stamps Transaction.erpSyncedAt = now().
// On failure, logs and returns 502 — transaction record remains valid.

const syncTransactionErp = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await findBooking(req.params.id, companyId);
    if (!booking) return sendError(res, 'Booking not found', 404);

    const existing = await db.transaction.findUnique({
      where: { bookingId: booking.id },
      include: TRANSACTION_INCLUDE,
    });
    if (!existing) {
      return sendError(res, 'Transaction record not found for this booking', 404);
    }

    // Read the booking's invoice and payment records to pass to ERP
    const [invoices, payments] = await Promise.all([
      db.invoice.findMany({ where: { bookingId: booking.id, companyId } }),
      db.transactionPayment.findMany({ where: { bookingId: booking.id, companyId } }),
    ]);

    try {
      const result = await syncTransaction({
        bookingId: booking.id,
        companyId,
        invoices,
        payments,
      });

      if (!result.success) throw new Error('ERP transaction sync returned failure');

      const updated = await db.transaction.update({
        where: { id: existing.id },
        data: { erpSyncedAt: new Date() },
        include: TRANSACTION_INCLUDE,
      });

      return sendSuccess(res, 'ERP sync successful', { transaction: updated });
    } catch (erpErr) {
      // ERP failure is non-blocking. Transaction record is still valid.
      console.error('[ERP TRANSACTION SYNC FAILED]', erpErr.message);
      return sendError(res, 'ERP sync failed. Transaction record remains valid.', 502);
    }
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions ────────────────────────────────────────────────────
// Sidebar-level list of all transactions for the company, enriched with
// booking.unit, booking.contact, and invoice/payment summary counts.

const listTransactions = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { status, search } = req.query;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const where = { companyId };

    if (status) where.status = status;

    if (search) {
      where.booking = {
        OR: [
          { inquiry: { contact: { fullName: { contains: search, mode: 'insensitive' } } } },
          { unit: { unitNumber: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      db.transaction.count({ where }),
      db.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              finalAmount: true,
              unit: {
                select: {
                  id: true,
                  unitNumber: true,
                  project: { select: { id: true, name: true } },
                },
              },
              inquiry: {
                select: {
                  id: true,
                  contact: { select: { id: true, fullName: true, phone: true } },
                },
              },
              _count: {
                select: {
                  invoices: true,
                  transactionPayments: true,
                },
              },
            },
          },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Transactions retrieved', { items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransaction,
  getTransaction,
  updateTransactionStatus,
  syncTransactionErp,
  listTransactions,
};
