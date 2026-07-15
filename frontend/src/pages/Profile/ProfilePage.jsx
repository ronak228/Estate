import { useState } from 'react';
import { Briefcase, ShieldCheck, Mail, Clock, User, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import PageLayout from '../../components/shared/PageLayout';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import FormError from '../../components/shared/FormError';
import { showSuccess } from '../../lib/toast';
import { formatDateTime } from '../../utils/format';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_EXECUTIVE: 'Sales Executive',
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon size={14} className="text-gray-400" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
    </div>
  </div>
);

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-danger', 'bg-warning', 'bg-sky-500', 'bg-success'];

const getPasswordStrength = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score++;
  return Math.min(score, 4);
};

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

  const strength = getPasswordStrength(passwordForm.newPassword);

  return (
    <PageLayout>
      {/* Identity banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-primary shadow-card-hover">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, rgba(255,255,255,0.16) 0, transparent 45%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.12) 0, transparent 40%)',
          }}
        />
        <div className="relative px-6 sm:px-7 py-6 flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight">{user?.fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
              {user?.companyName && (
                <span className="text-xs text-white/75">{user.companyName}</span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-white/85 mt-2">
              <Mail size={13} />
              {user?.email}
            </p>
          </div>

          <div className="ml-auto flex gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-white/65">Last Login</p>
              <p className="text-sm font-bold text-white mt-0.5">{formatDateTime(user?.lastLoginAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Account information */}
        <Card
          title={
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
                <User size={17} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Account Information</h2>
                <p className="text-xs text-gray-400 mt-0.5">Read-only — contact an admin to update these</p>
              </div>
            </div>
          }
        >
          <div className="flex flex-col">
            <DetailRow icon={Briefcase} label="Company" value={user?.companyName || '—'} />
            <DetailRow icon={ShieldCheck} label="Role" value={ROLE_LABELS[user?.role] || user?.role || '—'} />
            <DetailRow icon={Mail} label="Email" value={user?.email || '—'} />
            <DetailRow icon={Clock} label="Last Login" value={formatDateTime(user?.lastLoginAt)} />
          </div>
        </Card>

        {/* Change Password */}
        <Card
          title={
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
                <Lock size={17} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Change Password</h2>
                <p className="text-xs text-gray-400 mt-0.5">Use at least 6 characters</p>
              </div>
            </div>
          }
        >
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
              <div>
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
                {passwordForm.newPassword && (
                  <>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1 flex-1 rounded-full transition-colors duration-150 ease-snappy ${
                            step <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[11px] font-medium mt-1 ${
                      strength <= 1 ? 'text-danger' : strength === 2 ? 'text-warning' : strength === 3 ? 'text-sky-600' : 'text-success'
                    }`}>
                      {STRENGTH_LABELS[strength]} password
                    </p>
                  </>
                )}
              </div>
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handleChange}
                required
                error={errors.confirmPassword}
              />

              <div className="flex items-start gap-2.5 rounded-lg bg-info-50 px-3 py-2.5">
                <ShieldAlert size={15} className="text-info flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  You'll stay signed in on this device after changing your password, but other active sessions will be signed out.
                </p>
              </div>

              <FormError message={apiError} />

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
