import { useState } from 'react';
import companyService from '../../services/companyService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  address: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
  adminPhone: '',
};

/**
 * CompanyForm — create a Company + its first Admin user in one step.
 * Used in a Modal by CompanyListPage.
 */
const CompanyForm = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Company name is required';
    if (!form.adminFullName.trim()) errs.adminFullName = 'Admin full name is required';
    if (!form.adminEmail.trim()) errs.adminEmail = 'Admin email is required';
    if (!form.adminPassword || form.adminPassword.length < 6)
      errs.adminPassword = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    try {
      await companyService.createCompany({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        timezone: form.timezone,
        currency: form.currency,
        admin: {
          fullName: form.adminFullName.trim(),
          email: form.adminEmail.trim(),
          password: form.adminPassword,
          phone: form.adminPhone.trim() || undefined,
        },
      });
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout onSubmit={handleSubmit} onCancel={onCancel} submitLabel="Create Company" submitting={submitting}>
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Company Details</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Company Name" name="name" value={form.name} onChange={handleChange} required error={errors.name} />
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
        <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Input label="Address" name="address" value={form.address} onChange={handleChange} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Timezone</label>
          <select
            name="timezone"
            value={form.timezone}
            onChange={handleChange}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Currency</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="INR">INR — Indian Rupee</option>
            <option value="AED">AED — UAE Dirham</option>
            <option value="USD">USD — US Dollar</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-4">First Admin Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" name="adminFullName" value={form.adminFullName} onChange={handleChange} required error={errors.adminFullName} />
          <Input label="Email" name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required error={errors.adminEmail} />
          <Input label="Password" name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required error={errors.adminPassword} placeholder="Min 6 characters" />
          <Input label="Phone" name="adminPhone" value={form.adminPhone} onChange={handleChange} />
        </div>
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default CompanyForm;
