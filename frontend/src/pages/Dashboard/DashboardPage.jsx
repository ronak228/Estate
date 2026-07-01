import { useAuth } from '../../context/AuthContext';
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
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <PageLayout>
      <PageHeader
        title={`Welcome, ${user?.fullName}`}
        subtitle={isSuperAdmin ? 'Platform overview' : user?.companyName}
      />

      {isSuperAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Total Companies" value="—" color="primary" />
          <StatCard icon={Building2} label="Active" value="—" color="emerald" />
          <StatCard icon={Building2} label="Suspended" value="—" color="amber" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={PhoneCall} label="Open Inquiries" value="—" color="primary" />
          <StatCard icon={Users} label="Contacts" value="—" color="sky" />
          <StatCard icon={CalendarCheck} label="Site Visits Today" value="—" color="amber" />
          <StatCard icon={FileText} label="Pending Quotations" value="—" color="primary" />
          <StatCard icon={BookOpen} label="Recent Bookings" value="—" color="emerald" />
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500 text-center">
          Dashboard widgets will populate as CRM modules are activated in subsequent phases.
        </p>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;
