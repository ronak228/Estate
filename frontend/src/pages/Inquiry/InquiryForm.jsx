import { useState, useEffect } from 'react';
import inquiryService from '../../services/inquiryService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';
import Textarea from '../../components/shared/Textarea';
import { showSuccess } from '../../lib/toast';

const SOURCE_OPTIONS = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * InquiryForm — create or edit an inquiry.
 *
 * Create mode:
 *   - Contact is always entered via name + phone. The backend looks up by phone
 *     first and reuses an existing contact if found (no duplicates).
 *   - assignedTo and source are required.
 *
 * Edit mode:
 *   - Only source, notes, projectId, brokerId are editable.
 */
const InquiryForm = ({ inquiry, onSuccess, onCancel }) => {
  const isEdit = !!inquiry;

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    projectId: '',
    brokerId: '',
    assignedToId: '',
    source: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [brokers, setBrokers] = useState([]);

  // Load reference data
  useEffect(() => {
    Promise.all([
      inquiryService.getAssignableUsers(),
      inquiryService.getProjects(),
      inquiryService.getBrokers(),
    ])
      .then(([u, p, b]) => {
        setUsers(u);
        setProjects(p);
        setBrokers(b);
      })
      .catch(() => {});
  }, []);

  // Populate form in edit mode
  useEffect(() => {
    if (inquiry) {
      setForm({
        fullName: '',
        phone: '',
        email: '',
        projectId: inquiry.projectId || '',
        brokerId: inquiry.brokerId || '',
        assignedToId: inquiry.assignedToId || '',
        source: inquiry.source || '',
        notes: inquiry.notes || '',
      });
    }
  }, [inquiry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.source) errs.source = 'Source is required';
    if (!isEdit) {
      if (!form.fullName.trim()) errs.fullName = 'Full name is required';
      if (!form.phone.trim()) errs.phone = 'Phone is required';
      if (!form.assignedToId) errs.assignedToId = 'Assignee is required';
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
      if (isEdit) {
        await inquiryService.updateInquiry(inquiry.id, {
          source: form.source || undefined,
          notes: form.notes || undefined,
          projectId: form.projectId || undefined,
          brokerId: form.brokerId || undefined,
        });
      } else {
        await inquiryService.createInquiry({
          newContact: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || undefined,
          },
          source: form.source,
          assignedToId: form.assignedToId,
          notes: form.notes.trim() || undefined,
          projectId: form.projectId || undefined,
          brokerId: form.brokerId || undefined,
        });
      }
      showSuccess(isEdit ? 'Inquiry updated successfully' : 'Inquiry created successfully');
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.fullName} (${u.role.replace('_', ' ')})`,
  }));
  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.location ? `${p.name} — ${p.location}` : p.name,
  }));
  const brokerOptions = brokers.map((b) => ({
    value: b.id,
    label: b.company_name ? `${b.name} (${b.company_name})` : b.name,
  }));

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save Changes' : 'Create Inquiry'}
      submitting={submitting}
    >
      {/* ── Contact (create only) ── */}
      {!isEdit && (
        <>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            If this phone number already exists in your contacts, it will be reused automatically.
          </p>
          <Input
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
            error={errors.fullName}
            placeholder="e.g. Rahul Sharma"
          />
          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            error={errors.phone}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Email (optional)"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="rahul@example.com"
          />
        </>
      )}

      {/* ── Source ── */}
      <Select
        label="Source"
        name="source"
        value={form.source}
        onChange={handleChange}
        options={SOURCE_OPTIONS}
        required
        error={errors.source}
        placeholder="How did they reach out?"
      />

      {/* ── Assignee (create only) ── */}
      {!isEdit && (
        <Select
          label="Assign To"
          name="assignedToId"
          value={form.assignedToId}
          onChange={handleChange}
          options={userOptions}
          required
          error={errors.assignedToId}
          placeholder="Select sales rep..."
        />
      )}

      {/* ── Project ── */}
      <Select
        label="Project (optional)"
        name="projectId"
        value={form.projectId}
        onChange={handleChange}
        options={projectOptions}
        placeholder="No project selected"
      />

      {/* ── Broker ── */}
      <Select
        label="Broker (optional)"
        name="brokerId"
        value={form.brokerId}
        onChange={handleChange}
        options={brokerOptions}
        placeholder="No broker"
      />

      {/* ── Notes ── */}
      <Textarea
        label="Notes (optional)"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        rows={3}
        placeholder="Any additional information..."
      />

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default InquiryForm;
