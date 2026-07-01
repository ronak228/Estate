import { useState, useEffect } from 'react';
import companyService from '../../services/companyService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
];

/**
 * EmployeeForm — create or edit an employee.
 * When employee prop is provided, operates in edit mode (no password field).
 */
const EmployeeForm = ({ employee, onSuccess, onCancel }) => {
  const isEdit = !!employee;

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (employee) {
      setForm({
        fullName: employee.fullName || '',
        email: employee.email || '',
        password: '',
        role: employee.role || '',
        phone: employee.phone || '',
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!isEdit) {
      if (!form.email.trim()) errs.email = 'Email is required';
      if (!form.password || form.password.length < 6)
        errs.password = 'Password must be at least 6 characters';
    }
    if (!form.role) errs.role = 'Role is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    try {
      if (isEdit) {
        await companyService.updateEmployee(employee.id, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
        });
      } else {
        await companyService.createEmployee({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          phone: form.phone.trim() || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save Changes' : 'Create Employee'}
      submitting={submitting}
    >
      <Input
        label="Full Name"
        name="fullName"
        value={form.fullName}
        onChange={handleChange}
        required
        error={errors.fullName}
      />

      {!isEdit && (
        <>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            error={errors.password}
            placeholder="Min 6 characters"
          />
        </>
      )}

      <Select
        label="Role"
        name="role"
        value={form.role}
        onChange={handleChange}
        options={ROLE_OPTIONS}
        required
        error={errors.role}
        placeholder="Select role..."
      />

      <Input
        label="Phone"
        name="phone"
        value={form.phone}
        onChange={handleChange}
      />

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default EmployeeForm;
