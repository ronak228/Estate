import { useState, useEffect, useCallback } from 'react';
import { Plus, UserCog } from 'lucide-react';
import companyService from '../../services/companyService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ErrorState from '../../components/shared/ErrorState';
import EmployeeForm from './EmployeeForm';
import ResetPasswordForm from './ResetPasswordForm';
import { formatDate } from '../../utils/format';

const EmployeePage = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await companyService.listEmployees({
        search,
        role: filters.role || undefined,
        isActive: filters.isActive !== undefined ? filters.isActive : undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [search, filters.role, filters.isActive, page, pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDeactivateToggle = async () => {
    if (!deactivateTarget) return;
    setDeactivateLoading(true);
    setDeactivateError('');
    try {
      await companyService.updateEmployeeStatus(deactivateTarget.id, !deactivateTarget.isActive);
      setDeactivateTarget(null);
      fetchEmployees();
    } catch (err) {
      setDeactivateError(err.response?.data?.message || 'Action failed');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (val) => <StatusBadge value={val} /> },
    { key: 'phone', label: 'Phone' },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => <StatusBadge value={val} />,
    },
    { key: 'lastLoginAt', label: 'Last Login', render: (val) => formatDate(val) },
    ...(isAdmin
      ? [
          {
            key: 'id',
            label: 'Actions',
            render: (_, row) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditTarget(row); }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setResetPasswordTarget(row); }}
                >
                  Reset Password
                </Button>
                <Button
                  variant={row.isActive ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setDeactivateError(''); setDeactivateTarget(row); }}
                >
                  {row.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Employees"
        subtitle="Manage your company's team members"
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              New Employee
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search employees..."
        />
        <FilterBar
          filters={[
            {
              key: 'role',
              label: 'All Roles',
              type: 'select',
              options: [
                { value: 'ADMIN', label: 'Admin' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
              ],
            },
            {
              key: 'isActive',
              label: 'All Statuses',
              type: 'select',
              options: [
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ],
            },
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <UserCog size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No employees yet.</p>
              </div>
            }
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Employee" size="md">
        <EmployeeForm
          onSuccess={() => { setCreateOpen(false); fetchEmployees(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Employee" size="md">
        <EmployeeForm
          employee={editTarget}
          onSuccess={() => { setEditTarget(null); fetchEmployees(); }}
          onCancel={() => setEditTarget(null)}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        title={`Reset Password — ${resetPasswordTarget?.fullName}`}
        size="sm"
      >
        <ResetPasswordForm
          employee={resetPasswordTarget}
          onSuccess={() => { setResetPasswordTarget(null); }}
          onCancel={() => setResetPasswordTarget(null)}
        />
      </Modal>

      {/* Deactivate/Activate Confirm */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.isActive ? 'Deactivate Employee' : 'Activate Employee'}
        message={
          deactivateTarget?.isActive
            ? `Deactivating "${deactivateTarget?.fullName}" will prevent them from logging in. Continue?`
            : `Reactivating "${deactivateTarget?.fullName}" will restore their access. Continue?`
        }
        danger={deactivateTarget?.isActive}
        confirmLabel={deactivateTarget?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={handleDeactivateToggle}
        onCancel={() => setDeactivateTarget(null)}
        loading={deactivateLoading}
        error={deactivateError}
      />
    </PageLayout>
  );
};

export default EmployeePage;
