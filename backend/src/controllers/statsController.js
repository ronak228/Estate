const db = require('../db');
const { sendSuccess, sendError } = require('../utils/response');

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Dashboard aggregation endpoint (BUG-022).
// SUPER_ADMIN sees platform-level company counts; company users see CRM counts.

const getStats = async (req, res, next) => {
  try {
    const { role, companyId } = req.user;

    if (role === 'SUPER_ADMIN') {
      const [total, active, suspended] = await Promise.all([
        db.company.count(),
        db.company.count({ where: { status: 'ACTIVE' } }),
        db.company.count({ where: { status: 'SUSPENDED' } }),
      ]);
      return sendSuccess(res, 'Stats retrieved', {
        companies: { total, active, suspended },
      });
    }

    // Company-level stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      openInquiries,
      contacts,
      siteVisitsToday,
      pendingQuotations,
      confirmedBookings,
    ] = await Promise.all([
      db.inquiry.count({
        where: {
          companyId,
          stage: { notIn: ['BOOKED', 'NOT_INTERESTED'] },
        },
      }),
      db.contact.count({ where: { companyId } }),
      db.siteVisit.count({
        where: {
          inquiry: { companyId },
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        },
      }),
      db.quotation.count({
        where: {
          inquiry: { companyId },
          decision: 'PENDING',
        },
      }),
      db.booking.count({
        where: {
          inquiry: { companyId },
          status: 'CONFIRMED',
        },
      }),
    ]);

    return sendSuccess(res, 'Stats retrieved', {
      openInquiries,
      contacts,
      siteVisitsToday,
      pendingQuotations,
      confirmedBookings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
