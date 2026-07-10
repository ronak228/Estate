import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { showSuccess } from '../../lib/toast';
import { formatDateTime } from '../../utils/format';

const ProfilePage = () => {
  const { user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6)
      errs.newPassword = 'New password must be at least 6 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      showSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader title="My Profile" />

      <div className="max-w-2xl flex flex-col gap-5">
        {/* Profile Info */}
        <Card padding="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{user?.fullName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1">
                <StatusBadge value={user?.role} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">Company</p>
              <p className="font-medium text-gray-800">{user?.companyName || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Last Login</p>
              <p className="font-medium text-gray-800">{formatDateTime(user?.lastLoginAt)}</p>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card title="Change Password" padding="p-6">
          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handleChange}
                required
                error={errors.currentPassword}
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handleChange}
                required
                error={errors.newPassword}
                placeholder="Min 6 characters"
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handleChange}
                required
                error={errors.confirmPassword}
              />

              {apiError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {apiError}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" loading={saving}>
                  Change Password
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;
