import { useState } from 'react';
import interactionService from '../../services/interactionService';
import FormLayout from './FormLayout';
import Select from './Select';
import Input from './Input';
import Textarea from './Textarea';
import FormError from './FormError';
import { showSuccess } from '../../lib/toast';

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
      showSuccess('Interaction logged');
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

      <Textarea
        label="Notes"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        rows={4}
        required
        error={errors.notes}
        placeholder="What was discussed..."
      />

      <FormError message={apiError} />
    </FormLayout>
  );
};

export default InteractionForm;
