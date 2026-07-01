import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2 } from 'lucide-react';
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
import CompanyForm from './CompanyForm';
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
    try {
      const newStatus = suspendTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await companyService.updateCompanyStatus(suspendTarget.id, newStatus);
      setSuspendTarget(null);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
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
          variant={row.status === 'ACTIVE' ? 'outline' : 'ghost'}
          size="sm"
          onClick={(e) => { e.stopPropagation(); setSuspendTarget(row); }}
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
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New Company
          </Button>
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
            emptyState={
              <div className="flex flex-col items-center py-16">
                <Building2 size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No companies yet. Create the first one.</p>
              </div>
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
      />
    </PageLayout>
  );
};

export default CompanyListPage;
