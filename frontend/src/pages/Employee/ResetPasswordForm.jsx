import { useState } from 'react';
import companyService from '../../services/companyService';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';

/**
 * ResetPasswordForm — admin resets an employee's password.
 * Used inside a Modal.
 */
const ResetPasswordForm = ({ employee, onSuccess, onCancel }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await companyService.resetEmployeePassword(employee.id, newPassword);
      setSuccess(true);
      setTimeout(onSuccess, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-emerald-600 font-medium">Password reset successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Setting a new password for <strong>{employee?.fullName}</strong>.
        </p>
        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
          required
          placeholder="Min 6 characters"
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
          required
          placeholder="Repeat new password"
        />
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Reset Password
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
