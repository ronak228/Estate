import { useState } from 'react';
import interactionService from '../../services/interactionService';
import FormLayout from './FormLayout';
import Select from './Select';
import Input from './Input';

const TYPE_OPTIONS = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'NOTE', label: 'Note' },
];

/**
 * InteractionForm — quick-add interaction modal form.
 * contactId is required. inquiryOptions is optional list of { value, label }.
 */
const InteractionForm = ({ contactId, inquiryOptions = [], onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    type: '',
    notes: '',
    inquiryId: '',
    occurredAt: '',
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
    if (!form.type) errs.type = 'Interaction type is required';
    if (!form.notes.trim()) errs.notes = 'Notes are required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    try {
      await interactionService.createInteraction(contactId, {
        type: form.type,
        notes: form.notes.trim(),
        inquiryId: form.inquiryId || undefined,
        occurredAt: form.occurredAt || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to log interaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Log Interaction"
      submitting={submitting}
    >
      <Select
        label="Type"
        name="type"
        value={form.type}
        onChange={handleChange}
        options={TYPE_OPTIONS}
        required
        error={errors.type}
        placeholder="Select type..."
      />

      {inquiryOptions.length > 0 && (
        <Select
          label="Linked Inquiry (optional)"
          name="inquiryId"
          value={form.inquiryId}
          onChange={handleChange}
          options={inquiryOptions}
          placeholder="No linked inquiry"
        />
      )}

      <Input
        label="Date & Time (optional)"
        name="occurredAt"
        type="datetime-local"
        value={form.occurredAt}
        onChange={handleChange}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Notes <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={4}
          placeholder="What was discussed..."
          className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
            errors.notes ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        />
        {errors.notes && <p className="text-xs text-red-600">{errors.notes}</p>}
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default InteractionForm;
