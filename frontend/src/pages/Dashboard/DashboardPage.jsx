import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import statsService from '../../services/statsService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import { Building2, Users, PhoneCall, CalendarCheck, FileText, BookOpen } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color = 'primary' }) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5">
          {value ?? <span className="text-gray-300">—</span>}
        </p>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [stats, setStats] = useState(null);

  useEffect(() => {
    statsService.getStats()
      .then(setStats)
      .catch(() => {}); // Non-blocking — dashboard degrades gracefully
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title={`Welcome, ${user?.fullName}`}
        subtitle={isSuperAdmin ? 'Platform overview' : user?.companyName}
      />

      {isSuperAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Total Companies"  value={stats?.companies?.total}     color="primary" />
          <StatCard icon={Building2} label="Active"           value={stats?.companies?.active}    color="emerald" />
          <StatCard icon={Building2} label="Suspended"        value={stats?.companies?.suspended} color="amber"   />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={PhoneCall}    label="Open Inquiries"      value={stats?.openInquiries}    color="primary" />
          <StatCard icon={Users}        label="Contacts"             value={stats?.contacts}         color="sky"     />
          <StatCard icon={CalendarCheck} label="Site Visits Today"  value={stats?.siteVisitsToday}  color="amber"   />
          <StatCard icon={FileText}     label="Pending Quotations"  value={stats?.pendingQuotations} color="primary" />
          <StatCard icon={BookOpen}     label="Confirmed Bookings"  value={stats?.confirmedBookings} color="emerald" />
        </div>
      )}
    </PageLayout>
  );
};

export default DashboardPage;
