const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');
const { syncInventory, createSalesOrder, generateInvoice, syncCustomer } = require('../utils/erpSync');
const generateBookingReceiptPdf = require('../utils/generateBookingReceiptPdf');

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
    if (finalAmount == null || isNaN(Number(finalAmount)) || Number(finalAmount) <= 0) {
      return sendError(res, 'finalAmount must be a positive number', 400);
    }
    if (bookingAmount == null || isNaN(Number(bookingAmount)) || Number(bookingAmount) <= 0) {
      return sendError(res, 'bookingAmount must be a positive number', 400);
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

    // ── Verify unit belongs to this company ───────────────────────────────────
    const unit = await db.unit.findFirst({
      where: { id: quotation.unitId, project: { companyId } },
    });
    if (!unit) return sendError(res, 'Unit not found', 404);

    // ── DB Transaction: create booking + lock unit + advance inquiry stage ────
    // Duplicate booking check is enforced by @unique on Booking.inquiryId at DB level.
    // A P2002 error here will be caught and returned as a 409 by errorMiddleware.
    const [booking] = await db.$transaction([
      db.booking.create({
        data: {
          inquiryId,
          quotationId,
          unitId: quotation.unitId,
          finalAmount: Number(finalAmount),
          discountAmount: discountAmount != null ? Number(discountAmount) : 0,
          bookingAmount: Number(bookingAmount),
          bookedById: req.user.id,
          status: 'CONFIRMED',
        },
        include: BOOKING_INCLUDE,
      }),
      db.unit.update({
        where: { id: quotation.unitId },
        data: { status: 'RESERVED' },
      }),
      db.inquiry.update({
        where: { id: inquiryId },
        data: { stage: 'BOOKED' },
      }),
      db.activityLog.create({
        data: {
          inquiryId,
          type: 'STAGE_CHANGED',
          description: `Booking confirmed — Unit ${unit.unitNumber}, Final Amount: ₹${Number(finalAmount).toLocaleString('en-IN')}`,
          performedById: req.user.id,
        },
      }),
    ]);

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
      console.error('[ERP SYNC FAILED] Booking still valid.', erpErr.message);
    }

    return sendSuccess(res, 'Booking confirmed', { booking }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings ────────────────────────────────────────────────────────

const listBookings = async (req, res, next) => {
  try {
    const { status, search, page = 1, pageSize = 20 } = req.query;
    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {
      inquiry: { companyId },
    };

    if (status) where.status = status;

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
        take: parseInt(pageSize),
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
      page: parseInt(page),
      pageSize: parseInt(pageSize),
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
      select: { name: true, email: true, phone: true, address: true },
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

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return sendError(res, 'amount must be a positive number', 400);
    }

    const VALID_MODES = ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'];
    if (!mode) return sendError(res, 'mode is required', 400);
    if (!VALID_MODES.includes(mode)) {
      return sendError(res, `mode must be one of: ${VALID_MODES.join(', ')}`, 400);
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

module.exports = {
  createBooking,
  listBookings,
  getBooking,
  getBookingReceipt,
  retryErpSync,
  addPayment,
  listPayments,
};
