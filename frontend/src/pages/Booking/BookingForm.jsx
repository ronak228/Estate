import { useState, useEffect } from 'react';
import bookingService from '../../services/bookingService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import { showSuccess } from '../../lib/toast';
import { formatCurrency } from '../../utils/format';
import { isPositiveInteger, isNonNegativeInteger } from '../../utils/validation';

/**
 * BookingForm — convert an accepted-quotation inquiry into a confirmed booking.
 *
 * Customer/unit data is shown read-only from the quotation.
 * Only the financial fields (finalAmount, discountAmount, bookingAmount) are editable.
 *
 * Props:
 *   inquiry    — full inquiry row including contact
 *   quotation  — accepted quotation row including unit + project
 *   onSuccess  — () => void
 *   onCancel   — () => void
 */
const BookingForm = ({ inquiry, quotation, onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    finalAmount: quotation ? String(Number(quotation.totalAmount)) : '',
    discountAmount: '0',
    bookingAmount: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!isPositiveInteger(form.finalAmount)) {
      errs.finalAmount = 'Final amount must be a positive whole number';
    }
    if (!isNonNegativeInteger(form.discountAmount)) {
      errs.discountAmount = 'Discount must be a non-negative whole number';
    }
    if (!isPositiveInteger(form.bookingAmount)) {
      errs.bookingAmount = 'Booking (token) amount must be a positive whole number';
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
      await bookingService.createBooking({
        inquiryId: inquiry.id,
        quotationId: quotation.id,
        finalAmount: parseInt(form.finalAmount, 10),
        discountAmount: form.discountAmount ? parseInt(form.discountAmount, 10) : 0,
        bookingAmount: parseInt(form.bookingAmount, 10),
      });
      showSuccess('Booking confirmed successfully');
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const unit = quotation?.unit;
  const contact = inquiry?.contact;

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Confirm Booking"
      submitting={submitting}
    >
      {/* Read-only summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Booking Summary (Read-only)
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Customer</p>
            <p className="font-medium text-gray-900">{contact?.fullName || '—'}</p>
            <p className="text-xs text-gray-500">{contact?.phone || ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Unit</p>
            <p className="font-medium text-gray-900">
              Unit {unit?.unitNumber || '—'}
            </p>
            <p className="text-xs text-gray-500">{unit?.project?.name || ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Quoted Amount</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(quotation?.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Quotation Decision</p>
            <p className="font-semibold text-emerald-600">Accepted ✓</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Negotiated Terms
        </p>
      </div>

      <Input
        label="Final Agreed Amount"
        name="finalAmount"
        type="number"
        min="1"
        step="1"
        value={form.finalAmount}
        onChange={handleChange}
        placeholder="e.g. 4500000"
        required
        error={errors.finalAmount}
      />

      <Input
        label="Discount Amount"
        name="discountAmount"
        type="number"
        min="0"
        step="1"
        value={form.discountAmount}
        onChange={handleChange}
        placeholder="0"
        error={errors.discountAmount}
      />

      <Input
        label="Booking / Token Amount (due now)"
        name="bookingAmount"
        type="number"
        min="1"
        step="1"
        value={form.bookingAmount}
        onChange={handleChange}
        placeholder="e.g. 100000"
        required
        error={errors.bookingAmount}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
        Confirming this booking will:&nbsp;
        <strong>lock the unit</strong> (status → Reserved) and&nbsp;
        <strong>advance the inquiry</strong> to Booked stage.
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default BookingForm;
