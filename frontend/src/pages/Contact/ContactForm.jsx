import { useState, useEffect } from 'react';
import contactService from '../../services/contactService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import { showSuccess } from '../../lib/toast';

/**
 * ContactForm — edit contact details (budget, preferences, personal info).
 * Contacts are created automatically via Inquiry creation — only editing is supported here.
 */
const ContactForm = ({ contact, onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    company_name: '',
    address: '',
    budgetMin: '',
    budgetMax: '',
    preferredArea: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        fullName: contact.fullName || '',
        phone: contact.phone || '',
        email: contact.email || '',
        company_name: contact.company_name || '',
        address: contact.address || '',
        budgetMin: contact.budgetMin ?? '',
        budgetMax: contact.budgetMax ?? '',
        preferredArea: contact.preferredArea || '',
      });
    }
  }, [contact]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (form.budgetMin && isNaN(Number(form.budgetMin))) {
      errs.budgetMin = 'Must be a number';
    }
    if (form.budgetMax && isNaN(Number(form.budgetMax))) {
      errs.budgetMax = 'Must be a number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    try {
      await contactService.updateContact(contact.id, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        company_name: form.company_name.trim() || undefined,
        address: form.address.trim() || undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        preferredArea: form.preferredArea.trim() || undefined,
      });
      showSuccess('Contact updated successfully');
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update contact');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Save Changes"
      submitting={submitting}
    >
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
        Personal Information
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          required
          error={errors.fullName}
        />
        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          error={errors.phone}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />
        <Input
          label="Company"
          name="company_name"
          value={form.company_name}
          onChange={handleChange}
          placeholder="e.g. ABC Corp"
        />
      </div>

      <Input
        label="Address"
        name="address"
        value={form.address}
        onChange={handleChange}
        placeholder="Full address"
      />

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-4">
          Budget & Preferences
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Budget Min (₹)"
            name="budgetMin"
            type="number"
            value={form.budgetMin}
            onChange={handleChange}
            placeholder="e.g. 5000000"
            error={errors.budgetMin}
          />
          <Input
            label="Budget Max (₹)"
            name="budgetMax"
            type="number"
            value={form.budgetMax}
            onChange={handleChange}
            placeholder="e.g. 10000000"
            error={errors.budgetMax}
          />
          <Input
            label="Preferred Area"
            name="preferredArea"
            value={form.preferredArea}
            onChange={handleChange}
            placeholder="e.g. Bandra, Andheri"
            className="sm:col-span-2"
          />
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

export default ContactForm;
