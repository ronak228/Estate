import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import statsService from '../../services/statsService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import LoadingState from '../../components/shared/LoadingState';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import {
  Building2, Users, PhoneCall, CalendarCheck, FileText,
  Wallet, TrendingUp, Home, AlertTriangle, ListChecks, Trophy, Moon,
} from 'lucide-react';

const STAGE_LABELS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SITE_VISIT_SCHEDULED: 'Site Visit Scheduled',
  NEGOTIATION: 'Negotiation',
  BOOKED: 'Booked',
  NOT_INTERESTED: 'Not Interested',
};

// ─── Chart palette — validated (contrast/chroma/CVD) against the white chart
// surface via the dataviz skill's validator. Not eyeballed. ───────────────────
const CHART = {
  primary: '#4F46E5',   // app's own brand indigo — passes all checks standalone
  secondary: '#0d9488', // teal — passes alongside primary (CVD ΔE 76.6, both >=3:1 contrast)
  critical: '#d03b3b',  // reserved status red — "Not Interested" is a lost/exited state, not a step
  grid: '#e5e7eb',
  axisTick: '#9ca3af',
  axisLine: '#d1d5db',
  categoryTick: '#6b7280',
};
// Ordinal ramp for funnel stages (New -> Booked): one hue, monotone lightness,
// validated with --ordinal (adjacent ΔL >= 0.06, light end clears 2:1 contrast).
const STAGE_RAMP = ['#b1adf5', '#746eed', '#4940e7', '#261ce3', '#1e16b6', '#15107f'];
const FORWARD_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT_SCHEDULED', 'NEGOTIATION', 'BOOKED'];

const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px',
  },
  labelStyle: { fontWeight: 600, color: '#111827', marginBottom: 4 },
  cursor: { fill: '#f9fafb' },
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.primary}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5 truncate">
          {value ?? <span className="text-gray-300">—</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const Panel = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
    {children}
  </div>
);

const unitsLabel = (units = []) => units.map((u) => u.unit?.unitNumber).filter(Boolean).join(', ') || '—';

// ─── Super Admin — "Platform Health" ──────────────────────────────────────────

const PlatformDashboard = ({ stats }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Building2} label="Total Companies" value={stats.companies.total} color="primary" />
      <StatCard icon={Building2} label="Active" value={stats.companies.active} color="emerald" />
      <StatCard icon={Building2} label="Suspended" value={stats.companies.suspended} color="red" />
      <StatCard icon={TrendingUp} label="New This Month" value={stats.companies.newThisMonth} color="sky" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Users} label="Active Users" value={stats.users.active} sub={`of ${stats.users.total} total`} color="primary" />
      <StatCard icon={Moon} label="Dormant Companies" value={stats.dormantCompanies.length} sub="no login in 30 days" color="amber" />
    </div>

    <div className="mb-6">
      <Panel title="Company Growth (last 6 months)">
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={stats.companyGrowthTrend} margin={{ left: -10, top: 8, right: 16, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={{ stroke: CHART.axisLine }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={false} tickLine={false} width={28} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'New companies']} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART.primary}
                strokeWidth={2}
                dot={{ r: 4, fill: CHART.primary, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Panel title="Suspended Companies">
        <DataTable
          columns={[
            { key: 'name', label: 'Company' },
            { key: 'email', label: 'Email', render: (v) => v || '—' },
            { key: 'updatedAt', label: 'Since', render: (v) => formatDate(v) },
          ]}
          rows={stats.suspendedCompanies}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">No suspended companies</p>}
        />
      </Panel>
      <Panel title="Dormant Companies">
        <DataTable
          columns={[{ key: 'name', label: 'Company' }]}
          rows={stats.dormantCompanies}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">Everyone's logging in</p>}
        />
      </Panel>
      <Panel title="Most Active Companies">
        <DataTable
          columns={[
            { key: 'name', label: 'Company' },
            { key: 'activityScore', label: 'Activity (30d)', render: (v) => <span className="font-medium">{v}</span> },
          ]}
          rows={stats.mostActiveCompanies}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">No activity in the last 30 days</p>}
        />
      </Panel>
    </div>
  </>
);

// ─── Admin / Manager — "Business Health" ──────────────────────────────────────

const CompanyDashboard = ({ stats }) => {
  // Funnel stages are ordinal (order carries meaning) — one hue, monotone
  // lightness. "Not Interested" is a lost/exited state, not a step further
  // along, so it wears the reserved status color instead of the ramp.
  const stageChartData = [
    ...FORWARD_STAGES.map((stage, i) => ({
      stage: STAGE_LABELS[stage],
      count: stats.pipeline.inquiriesByStage.find((s) => s.stage === stage)?.count || 0,
      color: STAGE_RAMP[i],
    })),
    {
      stage: STAGE_LABELS.NOT_INTERESTED,
      count: stats.pipeline.inquiriesByStage.find((s) => s.stage === 'NOT_INTERESTED')?.count || 0,
      color: CHART.critical,
    },
  ].filter((row) => row.count > 0 || row.stage !== 'Not Interested');

  // Nominal categorical, single series — every project bar takes the same
  // slot-1 hue (color follows identity, never the value it's showing).
  const projectChartData = stats.sales.salesByProject.map((p) => ({ project: p.name, value: p.value, bookings: p.bookings }));

  return (
    <>
      {/* Financial pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Wallet} label="Revenue Collected" value={formatCurrency(stats.financial.revenueCollectedTotal)} sub={`${formatCurrency(stats.financial.revenueCollectedThisMonth)} this month`} color="emerald" />
        <StatCard icon={AlertTriangle} label="Outstanding Collection" value={formatCurrency(stats.financial.outstandingCollection)} color="amber" />
        <StatCard icon={TrendingUp} label="Bookings This Month" value={stats.sales.bookingsThisMonth.count} sub={formatCurrency(stats.sales.bookingsThisMonth.value)} color="primary" />
      </div>

      {/* Sales momentum + pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="Conversion Rate (30d)" value={`${stats.sales.conversionRate30d.toFixed(1)}%`} color="sky" />
        <StatCard icon={PhoneCall} label="Open Inquiries" value={stats.pipeline.openInquiries} color="primary" />
        <StatCard icon={Home} label="Available Units" value={stats.inventory.availableUnits} sub={`${stats.inventory.sellThroughRate.toFixed(1)}% sold through`} color="emerald" />
      </div>

      {/* Revenue & Bookings trend — two single-axis charts, never one dual-axis
          plot (aligning unrelated scales on shared gridlines invents a
          correlation that isn't in the data). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel title="Revenue Trend (last 6 months)">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={stats.sales.revenueTrend} margin={{ left: -6, top: 8, right: 12, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={{ stroke: CHART.axisLine }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART.axisTick }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Bookings Trend (last 6 months)">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={stats.sales.revenueTrend} margin={{ left: -10, top: 8, right: 16, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={{ stroke: CHART.axisLine }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Bookings']} />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke={CHART.secondary}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART.secondary, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel title="Inquiries by Stage">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={stageChartData} layout="vertical" margin={{ left: 24, top: 8, right: 16, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axisTick }} axisLine={{ stroke: CHART.axisLine }} tickLine={false} />
                <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 12, fill: CHART.categoryTick }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, 'Inquiries']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {stageChartData.map((row, i) => (
                    <Cell key={i} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2">Darker = further along the funnel · red = not interested</p>
        </Panel>

        <Panel title="Sales by Project">
          {projectChartData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={projectChartData} layout="vertical" margin={{ left: 24, top: 8, right: 16, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: CHART.axisTick }}
                    axisLine={{ stroke: CHART.axisLine }}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <YAxis type="category" dataKey="project" width={130} tick={{ fontSize: 12, fill: CHART.categoryTick }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatCurrency(v), 'Sales value']} />
                  <Bar dataKey="value" fill={CHART.primary} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">No confirmed bookings yet</p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Panel title="Sales Leaderboard (this month)">
          <DataTable
            columns={[
              { key: 'fullName', label: 'Employee' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'value', label: 'Value', render: (v) => formatCurrency(v) },
            ]}
            rows={stats.sales.salesLeaderboard}
            emptyState={<p className="text-sm text-gray-400 py-6 text-center">No bookings yet this month</p>}
          />
        </Panel>

        <Panel title="Recent Bookings">
          <DataTable
            columns={[
              { key: 'inquiry', label: 'Customer', render: (v) => v?.contact?.fullName || '—' },
              { key: 'unit', label: 'Unit', render: (v) => v?.unitNumber || '—' },
              { key: 'finalAmount', label: 'Amount', render: (v) => formatCurrency(v) },
              { key: 'createdAt', label: 'Booked', render: (v) => formatDate(v) },
            ]}
            rows={stats.recentBookings}
            emptyState={<p className="text-sm text-gray-400 py-6 text-center">No bookings yet</p>}
          />
        </Panel>
      </div>

      {/* Needs attention */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard icon={CalendarCheck} label="Site Visits Today" value={stats.attention.siteVisitsToday} color="amber" />
        <StatCard icon={FileText} label="Pending Quotations (3d+)" value={stats.attention.pendingQuotationsAging.count} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Upcoming Site Visits (next 7 days)">
          <DataTable
            columns={[
              { key: 'inquiry', label: 'Customer', render: (v) => v?.contact?.fullName || '—' },
              { key: 'units', label: 'Units', render: (v) => unitsLabel(v) },
              { key: 'scheduledAt', label: 'When', render: (v) => formatDateTime(v) },
            ]}
            rows={stats.pipeline.upcomingSiteVisits}
            emptyState={<p className="text-sm text-gray-400 py-6 text-center">Nothing scheduled this week</p>}
          />
        </Panel>

        <Panel title="Quotations Awaiting Decision">
          <DataTable
            columns={[
              { key: 'inquiry', label: 'Customer', render: (v) => v?.contact?.fullName || '—' },
              { key: 'unit', label: 'Unit', render: (v) => v?.unitNumber || '—' },
              { key: 'totalAmount', label: 'Amount', render: (v) => formatCurrency(v) },
              { key: 'createdAt', label: 'Sent', render: (v) => formatDate(v) },
            ]}
            rows={stats.attention.pendingQuotationsAging.items}
            emptyState={<p className="text-sm text-gray-400 py-6 text-center">Nothing waiting 3+ days</p>}
          />
        </Panel>
      </div>
    </>
  );
};

// ─── Sales Executive — "My Day" ───────────────────────────────────────────────
// Every card links straight to an actionable list — not just a number — so a
// follow-up or site visit can be acted on from the dashboard itself.

const PersonalDashboard = ({ stats }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <StatCard icon={CalendarCheck} label="My Site Visits Today" value={stats.mySiteVisitsToday.count} color="amber" />
      <StatCard icon={AlertTriangle} label="Follow-ups Overdue" value={stats.myFollowUps.overdue.count} color="red" />
      <StatCard icon={ListChecks} label="Follow-ups Due Today" value={stats.myFollowUps.dueToday.count} color="amber" />
      <StatCard icon={PhoneCall} label="My Open Inquiries" value={stats.myOpenInquiries.count} color="primary" />
      <StatCard icon={FileText} label="My Pending Quotations" value={stats.myPendingQuotations.count} color="sky" />
      <StatCard icon={Trophy} label="My Bookings This Month" value={stats.myBookingsThisMonth.count} sub={formatCurrency(stats.myBookingsThisMonth.value)} color="emerald" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Panel title="Site Visits Today">
        <DataTable
          columns={[
            { key: 'inquiry', label: 'Customer', render: (v) => v?.contact?.fullName || '—' },
            { key: 'units', label: 'Units', render: (v) => unitsLabel(v) },
            { key: 'scheduledAt', label: 'When', render: (v) => formatDateTime(v) },
          ]}
          rows={stats.mySiteVisitsToday.items}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">Nothing scheduled today</p>}
        />
      </Panel>

      <Panel title="Follow-ups Overdue">
        <DataTable
          columns={[
            { key: 'customerName', label: 'Customer', render: (_, row) => row.inquiry?.contact?.fullName || '—' },
            { key: 'customerPhone', label: 'Phone', render: (_, row) => row.inquiry?.contact?.phone || '—' },
            { key: 'scheduledAt', label: 'Was Due', render: (v) => formatDate(v) },
          ]}
          rows={stats.myFollowUps.overdue.items}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">Nothing overdue — you're caught up</p>}
        />
      </Panel>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Panel title="Follow-ups Due Today">
        <DataTable
          columns={[
            { key: 'customerName', label: 'Customer', render: (_, row) => row.inquiry?.contact?.fullName || '—' },
            { key: 'customerPhone', label: 'Phone', render: (_, row) => row.inquiry?.contact?.phone || '—' },
            { key: 'scheduledAt', label: 'When', render: (v) => formatDateTime(v) },
          ]}
          rows={stats.myFollowUps.dueToday.items}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">None due today</p>}
        />
      </Panel>

      <Panel title="My Pending Quotations">
        <DataTable
          columns={[
            { key: 'inquiry', label: 'Customer', render: (v) => v?.contact?.fullName || '—' },
            { key: 'unit', label: 'Unit', render: (v) => v?.unitNumber || '—' },
            { key: 'totalAmount', label: 'Amount', render: (v) => formatCurrency(v) },
            { key: 'createdAt', label: 'Sent', render: (v) => formatDate(v) },
          ]}
          rows={stats.myPendingQuotations.items}
          emptyState={<p className="text-sm text-gray-400 py-6 text-center">No quotations awaiting a decision</p>}
        />
      </Panel>
    </div>

    <Panel title="My Open Inquiries">
      <DataTable
        columns={[
          { key: 'customerName', label: 'Customer', render: (_, row) => row.contact?.fullName || '—' },
          { key: 'customerPhone', label: 'Phone', render: (_, row) => row.contact?.phone || '—' },
          { key: 'project', label: 'Project', render: (v) => v?.name || '—' },
          { key: 'stage', label: 'Stage', render: (v) => STAGE_LABELS[v] || v },
        ]}
        rows={stats.myOpenInquiries.items}
        emptyState={<p className="text-sm text-gray-400 py-6 text-center">No open inquiries assigned to you</p>}
      />
    </Panel>
  </>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getStats()
      .then(setStats)
      .catch(() => {}) // Non-blocking — dashboard degrades gracefully
      .finally(() => setLoading(false));
  }, []);

  const subtitle = {
    platform: 'Platform overview',
    company: 'Business health',
    personal: 'Your day at a glance',
  }[stats?.scope] || user?.companyName;

  return (
    <PageLayout>
      <PageHeader title={`Welcome, ${user?.fullName}`} subtitle={subtitle} />

      {loading ? (
        <LoadingState label="Loading dashboard..." />
      ) : !stats ? (
        <p className="text-sm text-gray-400">Couldn't load dashboard data.</p>
      ) : stats.scope === 'platform' ? (
        <PlatformDashboard stats={stats} />
      ) : stats.scope === 'personal' ? (
        <PersonalDashboard stats={stats} />
      ) : (
        <CompanyDashboard stats={stats} />
      )}
    </PageLayout>
  );
};

export default DashboardPage;
