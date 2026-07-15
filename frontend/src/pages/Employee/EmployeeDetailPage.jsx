import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, ShieldCheck, Clock, CalendarClock, KeyRound } from 'lucide-react';
import companyService from '../../services/companyService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmployeeForm from './EmployeeForm';
import ResetPasswordForm from './ResetPasswordForm';
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

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await companyService.getEmployee(id);
      setEmployee(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleDeactivateToggle = async () => {
    setDeactivateLoading(true);
    setDeactivateError('');
    try {
      const nowActive = !employee.isActive;
      await companyService.updateEmployeeStatus(employee.id, nowActive);
      showSuccess(nowActive ? 'Employee activated' : 'Employee deactivated');
      setDeactivateOpen(false);
      fetchEmployee();
    } catch (err) {
      setDeactivateError(err.response?.data?.message || 'Action failed');
    } finally {
      setDeactivateLoading(false);
    }
  };

  if (loading) return <PageLayout><LoadingState label="Loading employee..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchEmployee} /></PageLayout>;
  if (!employee) return null;

  return (
    <PageLayout>
      <PageHeader
        title={employee.fullName}
        subtitle={employee.email}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/employees')}>
              Back
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" icon={Edit} onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" icon={KeyRound} onClick={() => setResetPasswordOpen(true)}>
                  Reset Password
                </Button>
                <Button
                  variant={employee.isActive ? 'dangerOutline' : 'successOutline'}
                  size="sm"
                  onClick={() => { setDeactivateError(''); setDeactivateOpen(true); }}
                >
                  {employee.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Role</p>
          <div className="mt-1.5"><StatusBadge value={employee.role} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <div className="mt-1.5"><StatusBadge value={employee.isActive} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Last Login</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{formatDateTime(employee.lastLoginAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Member Since</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{formatDate(employee.createdAt)}</p>
        </div>
      </div>

      <Card
        title={
          <div className="flex items-center gap-3">
            <SectionIcon icon={ShieldCheck} />
            <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Employee Details</h2>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <DetailField icon={Mail} label="Email" value={employee.email} />
          <DetailField icon={Phone} label="Phone" value={employee.phone || '—'} />
          <DetailField icon={Clock} label="Last Login" value={formatDateTime(employee.lastLoginAt)} />
          <DetailField icon={CalendarClock} label="Member Since" value={formatDate(employee.createdAt)} />
        </dl>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Employee" size="md">
        <EmployeeForm
          employee={employee}
          onSuccess={() => { setEditOpen(false); fetchEmployee(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        title={`Reset Password — ${employee.fullName}`}
        size="sm"
      >
        <ResetPasswordForm
          employee={employee}
          onSuccess={() => setResetPasswordOpen(false)}
          onCancel={() => setResetPasswordOpen(false)}
        />
      </Modal>

      {/* Deactivate/Activate Confirm */}
      <ConfirmDialog
        isOpen={deactivateOpen}
        title={employee.isActive ? 'Deactivate Employee' : 'Activate Employee'}
        message={
          employee.isActive
            ? `Deactivating "${employee.fullName}" will prevent them from logging in. Continue?`
            : `Reactivating "${employee.fullName}" will restore their access. Continue?`
        }
        danger={employee.isActive}
        confirmLabel={employee.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={handleDeactivateToggle}
        onCancel={() => setDeactivateOpen(false)}
        loading={deactivateLoading}
        error={deactivateError}
      />
    </PageLayout>
  );
};

export default EmployeeDetailPage;
