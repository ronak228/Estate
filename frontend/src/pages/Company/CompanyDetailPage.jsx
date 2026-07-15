import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Globe2, Users, CalendarClock, Ban, CheckCircle } from 'lucide-react';
import companyService from '../../services/companyService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';
import DataTable from '../../components/shared/DataTable';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
import { showSuccess } from '../../lib/toast';
import { formatDate, formatDateTime } from '../../utils/format';

const SectionIcon = ({ icon: Icon }) => (
  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
    <Icon size={17} />
  </div>
);

const DetailField = ({ icon: Icon, label, value }) => (
  <div>
    <dt className="text-[11px] text-gray-400 flex items-center gap-1.5">
      <Icon size={12} className="text-gray-400" />
      {label}
    </dt>
    <dd className="font-semibold text-gray-800 mt-1">{value}</dd>
  </div>
);

const USER_COLUMNS = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (val) => <StatusBadge value={val} /> },
  { key: 'phone', label: 'Phone', render: (val) => val || '—' },
  { key: 'isActive', label: 'Status', render: (val) => <StatusBadge value={val} /> },
  { key: 'lastLoginAt', label: 'Last Login', render: (val) => formatDateTime(val) },
];

const CompanyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await companyService.getCompanyById(id);
      setCompany(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleSuspendToggle = async () => {
    setSuspendLoading(true);
    setSuspendError('');
    try {
      const newStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await companyService.updateCompanyStatus(company.id, newStatus);
      showSuccess(newStatus === 'SUSPENDED' ? 'Company suspended' : 'Company reactivated');
      setSuspendOpen(false);
      fetchCompany();
    } catch (err) {
      setSuspendError(err.response?.data?.message || 'Action failed');
    } finally {
      setSuspendLoading(false);
    }
  };

  if (loading) return <PageLayout><LoadingState label="Loading company..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchCompany} /></PageLayout>;
  if (!company) return null;

  return (
    <PageLayout>
      <PageHeader
        title={company.name}
        subtitle={company.slug}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/companies')}>
              Back
            </Button>
            <Button
              variant={company.status === 'ACTIVE' ? 'dangerOutline' : 'successOutline'}
              size="sm"
              icon={company.status === 'ACTIVE' ? Ban : CheckCircle}
              onClick={() => { setSuspendError(''); setSuspendOpen(true); }}
            >
              {company.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </Button>
          </div>
        }
      />

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <div className="mt-1.5"><StatusBadge value={company.status} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Users</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{company._count?.users ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Projects</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{company._count?.projects ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Inquiries</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{company._count?.inquiries ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={Building2} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Company Details</h2>
            </div>
          }
        >
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm">
            <DetailField icon={Mail} label="Email" value={company.email || '—'} />
            <DetailField icon={Phone} label="Phone" value={company.phone || '—'} />
            <DetailField icon={MapPin} label="Address" value={company.address || '—'} />
            <DetailField icon={Globe2} label="Timezone" value={`${company.timezone} · ${company.currency}`} />
            <DetailField icon={CalendarClock} label="Created" value={formatDate(company.createdAt)} />
          </dl>
        </Card>

        <Card
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={Users} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">
                Users ({company._count?.users ?? 0})
              </h2>
            </div>
          }
        >
          <DataTable
            columns={USER_COLUMNS}
            rows={company.users || []}
            emptyState={<EmptyState compact icon={Users} message="No users yet." />}
          />
        </Card>
      </div>

      {/* Suspend/Reactivate Confirm */}
      <ConfirmDialog
        isOpen={suspendOpen}
        title={company.status === 'ACTIVE' ? 'Suspend Company' : 'Reactivate Company'}
        message={
          company.status === 'ACTIVE'
            ? `Suspending "${company.name}" will block all logins for its users. Continue?`
            : `Reactivating "${company.name}" will restore access for its users. Continue?`
        }
        danger={company.status === 'ACTIVE'}
        confirmLabel={company.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        onConfirm={handleSuspendToggle}
        onCancel={() => setSuspendOpen(false)}
        loading={suspendLoading}
        error={suspendError}
      />
    </PageLayout>
  );
};

export default CompanyDetailPage;
