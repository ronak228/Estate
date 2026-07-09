import { useState } from 'react';
import FormLayout from './FormLayout';
import Input from './Input';
import Select from './Select';
import { isPositiveInteger } from '../../utils/validation';

const PAYMENT_MODE_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * PaymentForm — record a new BookingPayment for a booking.
 *
 * Props:
 *   onSubmit  — async (data) => void, called with { amount, mode, paidAt, referenceNumber }
 *   onCancel  — () => void
 *   submitting — boolean
 *   apiError   — string
 */
const PaymentForm = ({ onSubmit, onCancel, submitting = false, apiError = '' }) => {
  const [form, setForm] = useState({
    amount: '',
    mode: '',
    paidAt: new Date().toISOString().split('T')[0],
    referenceNumber: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!isPositiveInteger(form.amount)) {
      errs.amount = 'Amount must be a positive whole number';
    }
    if (!form.mode) errs.mode = 'Payment mode is required';
    if (!form.paidAt) errs.paidAt = 'Payment date is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit({
      amount: parseInt(form.amount, 10),
      mode: form.mode,
      paidAt: form.paidAt,
      referenceNumber: form.referenceNumber.trim() || undefined,
    });
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Record Payment"
      submitting={submitting}
    >
      <Input
        label="Amount"
        name="amount"
        type="number"
        min="1"
        step="1"
        value={form.amount}
        onChange={handleChange}
        placeholder="e.g. 500000"
        required
        error={errors.amount}
      />

      <Select
        label="Payment Mode"
        name="mode"
        value={form.mode}
        onChange={handleChange}
        options={PAYMENT_MODE_OPTIONS}
        required
        error={errors.mode}
        placeholder="Select mode..."
      />

      <Input
        label="Payment Date"
        name="paidAt"
        type="date"
        value={form.paidAt}
        onChange={handleChange}
        required
        error={errors.paidAt}
      />

      <Input
        label="Reference Number (optional)"
        name="referenceNumber"
        value={form.referenceNumber}
        onChange={handleChange}
        placeholder="Cheque no., UTR, transaction ID..."
      />

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default PaymentForm;
