import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Ban, CheckCircle } from 'lucide-react';
import companyService from '../../services/companyService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/shared/Modal';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import CompanyForm from './CompanyForm';
import { showSuccess } from '../../lib/toast';
import { formatDate } from '../../utils/format';

const COLUMNS = [
  { key: 'name', label: 'Company' },
  { key: 'slug', label: 'Slug' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge value={val} /> },
  {
    key: '_count',
    label: 'Users',
    render: (val) => val?.users ?? '—',
  },
  { key: 'createdAt', label: 'Created', render: (val) => formatDate(val) },
];

const CompanyListPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await companyService.listCompanies({
        search,
        status: filters.status || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, filters.status, page, pageSize]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSuspendToggle = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    setSuspendError('');
    try {
      const newStatus = suspendTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await companyService.updateCompanyStatus(suspendTarget.id, newStatus);
      showSuccess(newStatus === 'SUSPENDED' ? 'Company suspended' : 'Company reactivated');
      setSuspendTarget(null);
      fetchCompanies();
    } catch (err) {
      setSuspendError(err.response?.data?.message || 'Action failed');
    } finally {
      setSuspendLoading(false);
    }
  };

  const columnsWithActions = [
    ...COLUMNS,
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant={row.status === 'ACTIVE' ? 'dangerOutline' : 'successOutline'}
          size="sm"
          icon={row.status === 'ACTIVE' ? Ban : CheckCircle}
          onClick={(e) => { e.stopPropagation(); setSuspendError(''); setSuspendTarget(row); }}
        >
          {row.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        </Button>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Companies"
        subtitle="Manage all tenant companies on the platform"
        actions={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              {total} total
            </span>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              New Company
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search companies..." />
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'All Statuses',
              type: 'select',
              options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ],
            },
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchCompanies} />
      ) : (
        <>
          <DataTable
            columns={columnsWithActions}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/companies/${row.id}`)}
            emptyState={
              <EmptyState icon={Building2} message="No companies yet. Create the first one." />
            }
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Company" size="lg">
        <CompanyForm
          onSuccess={() => { setCreateOpen(false); fetchCompanies(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Suspend/Reactivate Confirm */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        title={suspendTarget?.status === 'ACTIVE' ? 'Suspend Company' : 'Reactivate Company'}
        message={
          suspendTarget?.status === 'ACTIVE'
            ? `Suspending "${suspendTarget?.name}" will block all logins for its users. Continue?`
            : `Reactivating "${suspendTarget?.name}" will restore access for its users. Continue?`
        }
        danger={suspendTarget?.status === 'ACTIVE'}
        confirmLabel={suspendTarget?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        onConfirm={handleSuspendToggle}
        onCancel={() => setSuspendTarget(null)}
        loading={suspendLoading}
        error={suspendError}
      />
    </PageLayout>
  );
};

export default CompanyListPage;
