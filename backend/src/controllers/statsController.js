const db = require('../db');
const { sendSuccess } = require('../utils/response');

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateRanges() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const days7Ahead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return { now, startOfMonth, days30Ago, days3Ago, days7Ahead, todayStart, todayEnd };
}

/** Last n calendar months (oldest first), as { start, end, label } buckets. */
function getLastNMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    months.push({ start, end, label });
  }
  return months;
}

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Dashboard aggregation endpoint. Three distinct audiences, three distinct
// shapes — a Super Admin runs the platform, an Admin/Manager runs the
// business, a Sales Executive runs their own day. See dashboard requirements
// doc (Revision 3) for the reasoning behind exactly this set of numbers.

const getStats = async (req, res, next) => {
  try {
    const { role, companyId, id: userId } = req.user;

    if (role === 'SUPER_ADMIN') {
      return sendSuccess(res, 'Stats retrieved', await getPlatformStats());
    }

    if (role === 'SALES_EXECUTIVE') {
      return sendSuccess(res, 'Stats retrieved', await getPersonalStats(companyId, userId));
    }

    // ADMIN, MANAGER — full company business-health view
    return sendSuccess(res, 'Stats retrieved', await getCompanyStats(companyId));
  } catch (err) {
    next(err);
  }
};

// ─── Super Admin — "Platform Health" ──────────────────────────────────────────

async function getPlatformStats() {
  const { startOfMonth, days30Ago } = dateRanges();

  const [total, active, suspended, newThisMonth, totalUsers, activeUsers, suspendedCompanies] =
    await Promise.all([
      db.company.count(),
      db.company.count({ where: { status: 'ACTIVE' } }),
      db.company.count({ where: { status: 'SUSPENDED' } }),
      db.company.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.company.findMany({
        where: { status: 'SUSPENDED' },
        select: { id: true, name: true, email: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

  // Dormant: an ACTIVE company where no user has logged in within 30 days
  // (including companies where no user has ever logged in at all).
  const activeCompanies = await db.company.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, users: { select: { lastLoginAt: true } } },
  });
  const dormantCompanies = activeCompanies
    .filter((c) => {
      const logins = c.users.map((u) => u.lastLoginAt).filter(Boolean);
      if (logins.length === 0) return true;
      const mostRecent = Math.max(...logins.map((d) => new Date(d).getTime()));
      return mostRecent < days30Ago.getTime();
    })
    .map((c) => ({ id: c.id, name: c.name }));

  // Most active: combined inquiry + booking activity in the last 30 days.
  const [inquiryCounts, recentBookings] = await Promise.all([
    db.inquiry.groupBy({
      by: ['companyId'],
      where: { createdAt: { gte: days30Ago } },
      _count: { id: true },
    }),
    db.booking.findMany({
      where: { createdAt: { gte: days30Ago } },
      select: { inquiry: { select: { companyId: true } } },
    }),
  ]);

  const scoreByCompany = new Map();
  inquiryCounts.forEach((row) => {
    scoreByCompany.set(row.companyId, (scoreByCompany.get(row.companyId) || 0) + row._count.id);
  });
  recentBookings.forEach((b) => {
    const cid = b.inquiry.companyId;
    scoreByCompany.set(cid, (scoreByCompany.get(cid) || 0) + 1);
  });

  const topCompanyIds = Array.from(scoreByCompany.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topCompanies = topCompanyIds.length
    ? await db.company.findMany({ where: { id: { in: topCompanyIds } }, select: { id: true, name: true } })
    : [];

  const mostActiveCompanies = topCompanyIds
    .map((id) => {
      const company = topCompanies.find((c) => c.id === id);
      return company ? { id: company.id, name: company.name, activityScore: scoreByCompany.get(id) } : null;
    })
    .filter(Boolean);

  // Company growth — new signups per month, last 6 months.
  const growthMonths = getLastNMonths(6);
  const companyGrowthTrend = await Promise.all(
    growthMonths.map(async ({ start, end, label }) => ({
      month: label,
      count: await db.company.count({ where: { createdAt: { gte: start, lt: end } } }),
    }))
  );

  return {
    scope: 'platform',
    companies: { total, active, suspended, newThisMonth },
    users: { total: totalUsers, active: activeUsers },
    suspendedCompanies,
    dormantCompanies,
    mostActiveCompanies,
    companyGrowthTrend,
  };
}

// ─── Admin / Manager — "Business Health" ──────────────────────────────────────

async function getCompanyStats(companyId) {
  const { startOfMonth, days30Ago, days3Ago, days7Ahead, todayStart, todayEnd } = dateRanges();
  const trendMonths = getLastNMonths(6);

  const [
    openInquiries,
    siteVisitsToday,
    inquiriesByStageRaw,
    bookingSumsAgg,
    paymentsSumAgg,
    bookingsThisMonthAgg,
    paymentsThisMonthAgg,
    inquiries30dCount,
    bookings30dCount,
    salesLeaderboardRaw,
    unitsByStatusRaw,
    pendingQuotationsAgingItems,
    pendingQuotationsAgingCount,
    confirmedBookingsForProjects,
    recentBookings,
    upcomingSiteVisits,
    revenueTrend,
  ] = await Promise.all([
    db.inquiry.count({ where: { companyId, stage: { notIn: ['BOOKED', 'NOT_INTERESTED'] } } }),
    db.siteVisit.count({
      where: {
        inquiry: { companyId },
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
    }),
    db.inquiry.groupBy({ by: ['stage'], where: { companyId }, _count: { id: true } }),
    db.booking.aggregate({
      where: { status: 'CONFIRMED', inquiry: { companyId } },
      _sum: { bookingAmount: true, finalAmount: true },
    }),
    db.bookingPayment.aggregate({
      where: { booking: { status: 'CONFIRMED', inquiry: { companyId } } },
      _sum: { amount: true },
    }),
    db.booking.aggregate({
      where: { status: 'CONFIRMED', inquiry: { companyId }, createdAt: { gte: startOfMonth } },
      _sum: { finalAmount: true, bookingAmount: true },
      _count: { id: true },
    }),
    db.bookingPayment.aggregate({
      where: { booking: { status: 'CONFIRMED', inquiry: { companyId } }, paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.inquiry.count({ where: { companyId, createdAt: { gte: days30Ago } } }),
    db.booking.count({
      where: { status: 'CONFIRMED', inquiry: { companyId }, createdAt: { gte: days30Ago } },
    }),
    db.booking.groupBy({
      by: ['bookedById'],
      where: { status: 'CONFIRMED', inquiry: { companyId }, createdAt: { gte: startOfMonth } },
      _sum: { finalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { finalAmount: 'desc' } },
      take: 10,
    }),
    db.unit.groupBy({ by: ['status'], where: { project: { companyId } }, _count: { id: true } }),
    db.quotation.findMany({
      where: { decision: 'PENDING', inquiry: { companyId }, createdAt: { lte: days3Ago } },
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        unit: { select: { unitNumber: true } },
        inquiry: { select: { contact: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    db.quotation.count({
      where: { decision: 'PENDING', inquiry: { companyId }, createdAt: { lte: days3Ago } },
    }),
    // Sales by Project — Booking has no companyId/projectId of its own, so pull
    // the join and reduce in JS rather than groupBy on a non-scalar field.
    db.booking.findMany({
      where: { status: 'CONFIRMED', inquiry: { companyId } },
      select: { finalAmount: true, unit: { select: { projectId: true, project: { select: { name: true } } } } },
    }),
    db.booking.findMany({
      where: { status: 'CONFIRMED', inquiry: { companyId } },
      select: {
        id: true,
        finalAmount: true,
        createdAt: true,
        unit: { select: { unitNumber: true } },
        inquiry: { select: { contact: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    db.siteVisit.findMany({
      where: {
        inquiry: { companyId },
        scheduledAt: { gte: todayStart, lte: days7Ahead },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
      select: {
        id: true,
        scheduledAt: true,
        inquiry: { select: { contact: { select: { fullName: true } } } },
        units: { select: { unit: { select: { unitNumber: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    }),
    Promise.all(
      trendMonths.map(async ({ start, end, label }) => {
        const [bookingAgg, paymentAgg, bookingCount] = await Promise.all([
          db.booking.aggregate({
            where: { status: 'CONFIRMED', inquiry: { companyId }, createdAt: { gte: start, lt: end } },
            _sum: { bookingAmount: true },
          }),
          db.bookingPayment.aggregate({
            where: { booking: { status: 'CONFIRMED', inquiry: { companyId } }, paidAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          db.booking.count({
            where: { status: 'CONFIRMED', inquiry: { companyId }, createdAt: { gte: start, lt: end } },
          }),
        ]);
        return {
          month: label,
          revenue: Number(bookingAgg._sum.bookingAmount || 0) + Number(paymentAgg._sum.amount || 0),
          bookings: bookingCount,
        };
      })
    ),
  ]);

  // ── Financial ────────────────────────────────────────────────────────────
  const revenueCollectedTotal =
    Number(bookingSumsAgg._sum.bookingAmount || 0) + Number(paymentsSumAgg._sum.amount || 0);
  const revenueCollectedThisMonth =
    Number(bookingsThisMonthAgg._sum.bookingAmount || 0) + Number(paymentsThisMonthAgg._sum.amount || 0);
  const outstandingCollection = Number(bookingSumsAgg._sum.finalAmount || 0) - revenueCollectedTotal;

  // ── Sales momentum ───────────────────────────────────────────────────────
  const bookingsThisMonth = {
    count: bookingsThisMonthAgg._count.id,
    value: Number(bookingsThisMonthAgg._sum.finalAmount || 0),
  };
  const conversionRate30d = inquiries30dCount > 0 ? (bookings30dCount / inquiries30dCount) * 100 : 0;

  const leaderboardUserIds = salesLeaderboardRaw.map((row) => row.bookedById);
  const leaderboardUsers = leaderboardUserIds.length
    ? await db.user.findMany({ where: { id: { in: leaderboardUserIds } }, select: { id: true, fullName: true } })
    : [];
  const salesLeaderboard = salesLeaderboardRaw.map((row) => ({
    userId: row.bookedById,
    fullName: leaderboardUsers.find((u) => u.id === row.bookedById)?.fullName || 'Unknown',
    bookings: row._count.id,
    value: Number(row._sum.finalAmount || 0),
  }));

  const projectScores = new Map();
  confirmedBookingsForProjects.forEach((b) => {
    const pid = b.unit.projectId;
    const existing = projectScores.get(pid) || { name: b.unit.project.name, bookings: 0, value: 0 };
    existing.bookings += 1;
    existing.value += Number(b.finalAmount);
    projectScores.set(pid, existing);
  });
  const salesByProject = Array.from(projectScores.values()).sort((a, b) => b.value - a.value);

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const inquiriesByStage = inquiriesByStageRaw.map((row) => ({ stage: row.stage, count: row._count.id }));

  // ── Inventory ─────────────────────────────────────────────────────────────
  const unitCounts = { AVAILABLE: 0, RESERVED: 0, SOLD: 0 };
  unitsByStatusRaw.forEach((row) => { unitCounts[row.status] = row._count.id; });
  const totalUnits = unitCounts.AVAILABLE + unitCounts.RESERVED + unitCounts.SOLD;
  const sellThroughRate = totalUnits > 0 ? (unitCounts.SOLD / totalUnits) * 100 : 0;

  return {
    scope: 'company',
    financial: {
      revenueCollectedTotal,
      revenueCollectedThisMonth,
      outstandingCollection,
    },
    sales: {
      bookingsThisMonth,
      conversionRate30d,
      salesLeaderboard,
      salesByProject,
      revenueTrend,
    },
    pipeline: {
      openInquiries,
      inquiriesByStage,
      upcomingSiteVisits,
    },
    inventory: {
      availableUnits: unitCounts.AVAILABLE,
      reservedUnits: unitCounts.RESERVED,
      soldUnits: unitCounts.SOLD,
      totalUnits,
      sellThroughRate,
    },
    attention: {
      siteVisitsToday,
      pendingQuotationsAging: {
        count: pendingQuotationsAgingCount,
        items: pendingQuotationsAgingItems,
      },
    },
    recentBookings,
  };
}

// ─── Sales Executive — "My Day" ───────────────────────────────────────────────
// Every item is a real, actionable list — not just a count — so a follow-up or
// site visit can be acted on straight from the dashboard.

async function getPersonalStats(companyId, userId) {
  const { startOfMonth, todayStart, todayEnd } = dateRanges();

  const [
    mySiteVisitsTodayItems,
    myFollowUpsOverdueItems,
    myFollowUpsDueTodayItems,
    myOpenInquiriesItems,
    myOpenInquiriesCount,
    myPendingQuotationsItems,
    myPendingQuotationsCount,
    myBookingsThisMonthAgg,
  ] = await Promise.all([
    db.siteVisit.findMany({
      where: {
        createdById: userId,
        inquiry: { companyId },
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
      select: {
        id: true,
        scheduledAt: true,
        inquiry: { select: { contact: { select: { fullName: true, phone: true } } } },
        units: { select: { unit: { select: { unitNumber: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    db.followUp.findMany({
      where: { createdById: userId, inquiry: { companyId }, completedAt: null, scheduledAt: { lt: todayStart } },
      select: {
        id: true,
        scheduledAt: true,
        notes: true,
        inquiry: { select: { id: true, contact: { select: { fullName: true, phone: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    }),
    db.followUp.findMany({
      where: {
        createdById: userId,
        inquiry: { companyId },
        completedAt: null,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      select: {
        id: true,
        scheduledAt: true,
        notes: true,
        inquiry: { select: { id: true, contact: { select: { fullName: true, phone: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    }),
    db.inquiry.findMany({
      where: { assignedToId: userId, companyId, stage: { notIn: ['BOOKED', 'NOT_INTERESTED'] } },
      select: {
        id: true,
        stage: true,
        contact: { select: { fullName: true, phone: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.inquiry.count({
      where: { assignedToId: userId, companyId, stage: { notIn: ['BOOKED', 'NOT_INTERESTED'] } },
    }),
    db.quotation.findMany({
      where: { createdById: userId, inquiry: { companyId }, decision: 'PENDING' },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        unit: { select: { unitNumber: true } },
        inquiry: { select: { contact: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    db.quotation.count({ where: { createdById: userId, inquiry: { companyId }, decision: 'PENDING' } }),
    db.booking.aggregate({
      where: { bookedById: userId, inquiry: { companyId }, status: 'CONFIRMED', createdAt: { gte: startOfMonth } },
      _sum: { finalAmount: true },
      _count: { id: true },
    }),
  ]);

  return {
    scope: 'personal',
    mySiteVisitsToday: { count: mySiteVisitsTodayItems.length, items: mySiteVisitsTodayItems },
    myFollowUps: {
      overdue: { count: myFollowUpsOverdueItems.length, items: myFollowUpsOverdueItems },
      dueToday: { count: myFollowUpsDueTodayItems.length, items: myFollowUpsDueTodayItems },
    },
    myOpenInquiries: { count: myOpenInquiriesCount, items: myOpenInquiriesItems },
    myPendingQuotations: { count: myPendingQuotationsCount, items: myPendingQuotationsItems },
    myBookingsThisMonth: {
      count: myBookingsThisMonthAgg._count.id,
      value: Number(myBookingsThisMonthAgg._sum.finalAmount || 0),
    },
  };
}

module.exports = { getStats };
