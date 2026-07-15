const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination } = require('../utils/pagination');
const { VALID_PAYMENT_MODES } = require('../utils/constants');
const { isPositiveInteger, isNonNegativeInteger } = require('../utils/money');
const { syncInventory, createSalesOrder, generateInvoice, syncCustomer } = require('../utils/erpSync');
const generateBookingReceiptPdf = require('../utils/generateBookingReceiptPdf');
const generatePaymentReceiptPdf = require('../utils/generatePaymentReceiptPdf');
const logger = require('../utils/logger');

// ─── Shared include ───────────────────────────────────────────────────────────

const BOOKING_INCLUDE = {
  inquiry: {
    select: {
      id: true,
      stage: true,
      contact: {
        select: { id: true, fullName: true, phone: true, email: true, address: true },
      },
    },
  },
  quotation: {
    select: {
      id: true,
      basePrice: true,
      totalAmount: true,
      decision: true,
      charges: true,
    },
  },
  unit: {
    include: {
      project: { select: { id: true, name: true, location: true } },
    },
  },
  payments: {
    orderBy: { paidAt: 'asc' },
    include: { createdBy: { select: { id: true, fullName: true } } },
  },
  documents: {
    orderBy: { createdAt: 'asc' },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  },
  bookedBy: { select: { id: true, fullName: true } },
};

// ─── POST /api/bookings ───────────────────────────────────────────────────────
// IMPORTANT: ERP sync runs AFTER the DB transaction commits — never inside it.

const createBooking = async (req, res, next) => {
  try {
    const { inquiryId, quotationId, finalAmount, discountAmount, bookingAmount } = req.body;
    const companyId = req.user.companyId;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!inquiryId) return sendError(res, 'inquiryId is required', 400);
    if (!quotationId) return sendError(res, 'quotationId is required', 400);
    if (finalAmount == null || !isPositiveInteger(finalAmount)) {
      return sendError(res, 'finalAmount must be a positive whole number', 400);
    }
    if (bookingAmount == null || !isPositiveInteger(bookingAmount)) {
      return sendError(res, 'bookingAmount must be a positive whole number', 400);
    }

    // ── Verify inquiry belongs to this company ────────────────────────────────
    const inquiry = await db.inquiry.findFirst({
      where: { id: inquiryId, companyId },
      include: {
        contact: { select: { id: true, fullName: true, phone: true, email: true, address: true } },
      },
    });
    if (!inquiry) return sendError(res, 'Inquiry not found', 404);

    // ── Verify quotation is ACCEPTED and belongs to this inquiry ──────────────
    const quotation = await db.quotation.findFirst({
      where: { id: quotationId, inquiryId },
    });
    if (!quotation) return sendError(res, 'Quotation not found for this inquiry', 404);
    if (quotation.decision !== 'ACCEPTED') {
      return sendError(
        res,
        'Quotation must have decision ACCEPTED before creating a booking',
        400
      );
    }

    // ── Financial invariants (BUG-008) ────────────────────────────────────────
    // All money fields are whole-rupee integers — plain integer comparisons.
    if (discountAmount != null && !isNonNegativeInteger(discountAmount)) {
      return sendError(res, 'discountAmount must be a non-negative whole number', 400);
    }

    const quotationTotal = Number(quotation.totalAmount);
    const finalNum = Number(finalAmount);
    const bookingNum = Number(bookingAmount);
    const discountNum = discountAmount != null ? Number(discountAmount) : 0;

    if (discountNum > quotationTotal) {
      return sendError(res, 'discountAmount cannot exceed the quotation total', 400);
    }
    if (finalNum > quotationTotal) {
      return sendError(res, 'finalAmount cannot exceed the quotation total', 400);
    }
    if (bookingNum > finalNum) {
      return sendError(res, 'bookingAmount cannot exceed finalAmount', 400);
    }

    // ── Verify unit belongs to this company ───────────────────────────────────
    const unit = await db.unit.findFirst({
      where: { id: quotation.unitId, project: { companyId } },
    });
    if (!unit) return sendError(res, 'Unit not found', 404);

    // ── Availability guard (BUG-001) ──────────────────────────────────────────
    // Only an AVAILABLE unit may be booked. Reject early on a non-available unit.
    if (unit.status !== 'AVAILABLE') {
      return sendError(res, `Unit is not available for booking (current status: ${unit.status})`, 409);
    }

    // ── DB Transaction: create booking + lock unit + advance inquiry stage ────
    // Duplicate booking (per inquiry) is enforced by @unique on Booking.inquiryId.
    // A P2002 error here will be caught and returned as a 409 by errorMiddleware.
    //
    // Double-booking of the SAME unit (BUG-001) is prevented atomically: the unit
    // is reserved via a conditional updateMany on { id, status: 'AVAILABLE' }.
    // If a concurrent booking already reserved/sold the unit, count will be 0 and
    // the transaction is rolled back — no two bookings can back one unit.
    const booking = await db.$transaction(async (tx) => {
      const reserved = await tx.unit.updateMany({
        where: { id: quotation.unitId, status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });
      if (reserved.count !== 1) {
        const err = new Error('UNIT_NOT_AVAILABLE');
        err.code = 'UNIT_NOT_AVAILABLE';
        throw err;
      }

      const created = await tx.booking.create({
        data: {
          inquiryId,
          quotationId,
          unitId: quotation.unitId,
          finalAmount: finalNum,
          discountAmount: discountNum,
          bookingAmount: bookingNum,
          bookedById: req.user.id,
          status: 'CONFIRMED',
        },
        include: BOOKING_INCLUDE,
      });

      await tx.inquiry.update({
        where: { id: inquiryId },
        data: { stage: 'BOOKED' },
      });

      await tx.activityLog.create({
        data: {
          inquiryId,
          type: 'BOOKING_CONFIRMED',
          description: `Booking confirmed — Unit ${unit.unitNumber}, Final Amount: ₹${Number(finalAmount).toLocaleString('en-IN')}`,
          performedById: req.user.id,
        },
      });

      return created;
    });

    // ── ERP Sync (after commit — never inside the transaction) ────────────────
    // Per ERP contract §3: failures are logged; booking is still valid; erpSyncedAt stays null.
    try {
      const contact = inquiry.contact;

      // syncInventory and syncCustomer can run in parallel
      const [inventoryResult, customerResult] = await Promise.all([
        syncInventory({ companyId, unitId: unit.id, bookingId: booking.id }),
        syncCustomer({
          companyId,
          contactId: contact.id,
          fullName: contact.fullName,
          phone: contact.phone,
          email: contact.email,
          address: contact.address,
        }),
      ]);

      if (!inventoryResult.success) throw new Error('ERP inventory lock failed');

      const salesOrderResult = await createSalesOrder({
        companyId,
        bookingId: booking.id,
        unitId: unit.id,
        contactId: contact.id,
        finalAmount: Number(finalAmount),
        discountAmount: discountAmount != null ? Number(discountAmount) : 0,
        bookingAmount: Number(bookingAmount),
      });
      if (!salesOrderResult.success) throw new Error('ERP sales order creation failed');

      const invoiceResult = await generateInvoice({
        companyId,
        salesOrderRef: salesOrderResult.refId,
        amount: Number(finalAmount),
      });
      if (!invoiceResult.success) throw new Error('ERP invoice generation failed');

      // All four succeeded — stamp the booking
      await db.booking.update({
        where: { id: booking.id },
        data: {
          erpSyncedAt: new Date(),
          erpSalesOrderRef: salesOrderResult.refId,
        },
      });

      booking.erpSyncedAt = new Date();
      booking.erpSalesOrderRef = salesOrderResult.refId;
    } catch (erpErr) {
      // ERP failure is non-blocking. Booking is valid; retry via the sync endpoint.
      logger.error('ERP sync failed on booking creation — booking still valid, retry via sync endpoint', {
        bookingId: booking.id,
        companyId,
        error: erpErr.message,
      });
    }

    return sendSuccess(res, 'Booking confirmed', { booking }, 201);
  } catch (err) {
    // Atomic availability guard lost the race (BUG-001) — unit already reserved/sold.
    if (err && err.code === 'UNIT_NOT_AVAILABLE') {
      return sendError(res, 'Unit is no longer available for booking', 409);
    }
    next(err);
  }
};

// ─── GET /api/bookings ────────────────────────────────────────────────────────
const listBookings = async (req, res, next) => {
  try {
    const { status, search, inquiryId } = req.query;
    const companyId = req.user.companyId;
    const { page, pageSize, skip, take } = getPagination(req.query);

    const where = {
      inquiry: { companyId },
    };

    if (status) where.status = status;
    if (inquiryId) where.inquiryId = inquiryId;

    if (search) {
      where.OR = [
        { inquiry: { contact: { fullName: { contains: search, mode: 'insensitive' } } } },
        { unit: { unitNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      db.booking.count({ where }),
      db.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          inquiry: {
            select: {
              id: true,
              contact: { select: { id: true, fullName: true, phone: true } },
            },
          },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              project: { select: { id: true, name: true } },
            },
          },
          bookedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return sendSuccess(res, 'Bookings retrieved', {
      items,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────

const getBooking = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: BOOKING_INCLUDE,
    });

    if (!booking) return sendError(res, 'Booking not found', 404);

    return sendSuccess(res, 'Booking retrieved', { booking });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/receipt ────────────────────────────────────────────
//
// INTENTIONAL EXCEPTION: Returns binary PDF — not the standard JSON envelope.
// The frontend's bookingService uses responseType: 'blob' for this endpoint.

const getBookingReceipt = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: {
        inquiry: {
          select: {
            id: true,
            contact: { select: { id: true, fullName: true, phone: true, email: true, address: true } },
          },
        },
        quotation: {
          select: { id: true, totalAmount: true, basePrice: true, charges: true },
        },
        unit: {
          include: {
            project: { select: { id: true, name: true, location: true } },
          },
        },
        payments: {
          orderBy: { paidAt: 'asc' },
        },
        bookedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!booking) return sendError(res, 'Booking not found', 404);

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true, logoUrl: true, signatureUrl: true },
    });

    const pdfBuffer = await generateBookingReceiptPdf({
      booking,
      unit: booking.unit,
      contact: booking.inquiry?.contact,
      inquiry: booking.inquiry,
      quotation: booking.quotation,
      payments: booking.payments,
      company,
      bookedBy: booking.bookedBy,
    });

    const filename = `booking-receipt-${booking.id.slice(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id/payments/:paymentId/receipt
 * A receipt for a single payment row. `:paymentId` may be the literal string
 * "token" — the booking's token/booking amount isn't a BookingPayment row
 * (see utils/booking.js on the frontend, getPaymentHistory), so it's
 * synthesized here from the booking itself rather than looked up.
 */
const getPaymentReceipt = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id: bookingId, paymentId } = req.params;

    const booking = await db.booking.findFirst({
      where: { id: bookingId, inquiry: { companyId } },
      include: {
        inquiry: {
          select: { id: true, contact: { select: { id: true, fullName: true, phone: true, email: true } } },
        },
        unit: { include: { project: { select: { id: true, name: true, location: true } } } },
        payments: true,
        bookedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!booking) return sendError(res, 'Booking not found', 404);

    let payment;
    if (paymentId === 'token') {
      payment = {
        id: booking.id,
        isToken: true,
        amount: booking.bookingAmount,
        mode: null,
        paidAt: booking.createdAt,
        referenceNumber: null,
        createdBy: booking.bookedBy,
      };
    } else {
      payment = await db.bookingPayment.findFirst({
        where: { id: paymentId, bookingId: booking.id },
        include: { createdBy: { select: { id: true, fullName: true } } },
      });
      if (!payment) return sendError(res, 'Payment not found', 404);
    }

    const paymentsTotal = booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(booking.finalAmount || 0);
    const totalPaid = Number(booking.bookingAmount || 0) + paymentsTotal;
    const remainingAmount = Math.max(totalAmount - totalPaid, 0);

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true, logoUrl: true, signatureUrl: true },
    });

    const pdfBuffer = await generatePaymentReceiptPdf({
      payment,
      booking,
      financials: { totalAmount, totalPaid, remainingAmount },
      unit: booking.unit,
      contact: booking.inquiry?.contact,
      company,
    });

    const filename = `payment-receipt-${payment.id.slice(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/sync-erp ─────────────────────────────────────────
// Admin retry action for failed ERP sync. Re-runs all four calls idempotently.

const retryErpSync = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: {
        inquiry: {
          select: {
            id: true,
            contact: { select: { id: true, fullName: true, phone: true, email: true, address: true } },
          },
        },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    if (!booking) return sendError(res, 'Booking not found', 404);

    const contact = booking.inquiry.contact;

    const [inventoryResult, customerResult] = await Promise.all([
      syncInventory({ companyId, unitId: booking.unitId, bookingId: booking.id }),
      syncCustomer({
        companyId,
        contactId: contact.id,
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
      }),
    ]);

    if (!inventoryResult.success) return sendError(res, 'ERP inventory lock failed', 502);

    const salesOrderResult = await createSalesOrder({
      companyId,
      bookingId: booking.id,
      unitId: booking.unitId,
      contactId: contact.id,
      finalAmount: Number(booking.finalAmount),
      discountAmount: Number(booking.discountAmount),
      bookingAmount: Number(booking.bookingAmount),
    });
    if (!salesOrderResult.success) return sendError(res, 'ERP sales order creation failed', 502);

    const invoiceResult = await generateInvoice({
      companyId,
      salesOrderRef: salesOrderResult.refId,
      amount: Number(booking.finalAmount),
    });
    if (!invoiceResult.success) return sendError(res, 'ERP invoice generation failed', 502);

    const updated = await db.booking.update({
      where: { id: booking.id },
      data: {
        erpSyncedAt: new Date(),
        erpSalesOrderRef: salesOrderResult.refId,
      },
    });

    return sendSuccess(res, 'ERP sync successful', {
      erpSyncedAt: updated.erpSyncedAt,
      erpSalesOrderRef: updated.erpSalesOrderRef,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/payments ─────────────────────────────────────────

const addPayment = async (req, res, next) => {
  try {
    const { amount, mode, paidAt, referenceNumber } = req.body;
    const companyId = req.user.companyId;

    if (amount == null || !isPositiveInteger(amount)) {
      return sendError(res, 'amount must be a positive whole number', 400);
    }

    if (!VALID_PAYMENT_MODES.includes(mode)) {
      return sendError(res, `mode must be one of: ${VALID_PAYMENT_MODES.join(', ')}`, 400);
    }

    if (!paidAt) return sendError(res, 'paidAt is required', 400);
    const paidAtDate = new Date(paidAt);
    if (isNaN(paidAtDate.getTime())) {
      return sendError(res, 'paidAt must be a valid date', 400);
    }

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!booking) return sendError(res, 'Booking not found', 404);

    // ── Payment invariants (BUG-008) ──────────────────────────────────────────
    // No payments against a cancelled booking.
    if (booking.status === 'CANCELLED') {
      return sendError(res, 'Cannot record a payment against a cancelled booking', 400);
    }

    // Prevent over-payment: cumulative payments (including the token/booking
    // amount collected at booking time) must not exceed finalAmount. The token
    // amount is stored on the Booking itself, not as a BookingPayment row, so
    // it must be added in explicitly — omitting it previously allowed a booking
    // to be over-collected by up to its full token amount.
    const paidAgg = await db.bookingPayment.aggregate({
      where: { bookingId: booking.id },
      _sum: { amount: true },
    });
    const paidSoFar = Number(paidAgg._sum.amount || 0) + Number(booking.bookingAmount);
    const newTotal = paidSoFar + Number(amount);
    if (newTotal > Number(booking.finalAmount)) {
      const remaining = Number(booking.finalAmount) - paidSoFar;
      return sendError(
        res,
        `Payment exceeds the remaining balance (₹${remaining.toLocaleString('en-IN')}) for this booking`,
        400
      );
    }

    const payment = await db.bookingPayment.create({
      data: {
        bookingId: booking.id,
        amount: Number(amount),
        mode,
        paidAt: paidAtDate,
        referenceNumber: referenceNumber?.trim() || null,
        createdById: req.user.id,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    return sendSuccess(res, 'Payment recorded', { payment }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id/payments ──────────────────────────────────────────

const listPayments = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
    });
    if (!booking) return sendError(res, 'Booking not found', 404);

    const items = await db.bookingPayment.findMany({
      where: { bookingId: booking.id },
      orderBy: { paidAt: 'asc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    return sendSuccess(res, 'Payments retrieved', { items });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/:id/cancel ───────────────────────────────────────────
//
// Cancels a CONFIRMED booking and atomically releases its unit back to AVAILABLE
// and reverts the inquiry from BOOKED to NEGOTIATION (BUG-011).

const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const companyId = req.user.companyId;

    const booking = await db.booking.findFirst({
      where: {
        id: req.params.id,
        inquiry: { companyId },
      },
      include: {
        unit: { select: { id: true, unitNumber: true } },
      },
    });
    if (!booking) return sendError(res, 'Booking not found', 404);

    if (booking.status === 'CANCELLED') {
      return sendError(res, 'Booking is already cancelled', 400);
    }

    const updated = await db.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
        include: BOOKING_INCLUDE,
      });

      // Release the unit back to AVAILABLE (only if it is still RESERVED by this
      // booking — never downgrade a unit that was manually marked SOLD elsewhere).
      await tx.unit.updateMany({
        where: { id: booking.unitId, status: 'RESERVED' },
        data: { status: 'AVAILABLE' },
      });

      // Revert the inquiry out of BOOKED back to NEGOTIATION.
      await tx.inquiry.update({
        where: { id: booking.inquiryId },
        data: { stage: 'NEGOTIATION' },
      });

      await tx.activityLog.create({
        data: {
          inquiryId: booking.inquiryId,
          type: 'BOOKING_CANCELLED',
          description: `Booking cancelled — Unit ${booking.unit.unitNumber} released${reason?.trim() ? ` (${reason.trim()})` : ''}`,
          performedById: req.user.id,
        },
      });

      return cancelled;
    });

    // NOTE: ERP reversal is intentionally not triggered here — the Phase 1 ERP
    // module (erpSync.js) is a stub with no reversal contract. When the real ERP
    // is integrated, a reversal call belongs here (after the transaction commits).

    return sendSuccess(res, 'Booking cancelled', { booking: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  listBookings,
  getBooking,
  getBookingReceipt,
  getPaymentReceipt,
  retryErpSync,
  addPayment,
  listPayments,
  cancelBooking,
};
