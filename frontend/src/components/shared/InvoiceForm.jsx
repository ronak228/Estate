import { useState } from 'react';
import FormLayout from './FormLayout';
import Input from './Input';

/**
 * InvoiceForm — simple form to generate a new CRM invoice for a booking.
 * Fields: amount, dueDate (optional), notes (optional).
 *
 * Props:
 *   onSubmit   — async ({ amount, dueDate?, notes? }) => void
 *   onCancel   — () => void
 *   submitting — boolean
 *   apiError   — string
 */
const InvoiceForm = ({ onSubmit, onCancel, submitting = false, apiError = '' }) => {
  const [form, setForm] = useState({ amount: '', dueDate: '', notes: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Amount must be a positive number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit({
      amount: Number(form.amount),
      dueDate: form.dueDate || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Generate Invoice"
      submitting={submitting}
    >
      <Input
        label="Invoice Amount"
        name="amount"
        type="number"
        min="1"
        step="0.01"
        value={form.amount}
        onChange={handleChange}
        placeholder="e.g. 1000000"
        required
        error={errors.amount}
      />

      <Input
        label="Due Date (optional)"
        name="dueDate"
        type="date"
        value={form.dueDate}
        onChange={handleChange}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="e.g. First installment — foundation milestone"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default InvoiceForm;
