import { useState, useEffect } from 'react';
import siteVisitService from '../../services/siteVisitService';
import inquiryService from '../../services/inquiryService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';
import UnitAvailabilityList from '../../components/shared/UnitAvailabilityList';

/**
 * SiteVisitForm — create or reschedule a site visit.
 * When siteVisit prop is provided, operates in edit/reschedule mode.
 */
const SiteVisitForm = ({ siteVisit, onSuccess, onCancel }) => {
  const isEdit = !!siteVisit;

  const [form, setForm] = useState({
    inquiryId: '',
    scheduledAt: '',
    notes: '',
    status: '',
  });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedInquiryProjectId, setSelectedInquiryProjectId] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [inquiries, setInquiries] = useState([]);

  useEffect(() => {
    // Load open inquiries for the dropdown
    inquiryService
      .listInquiries({ pageSize: 100 })
      .then((data) => setInquiries(data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (siteVisit) {
      setForm({
        inquiryId: siteVisit.inquiryId || '',
        scheduledAt: siteVisit.scheduledAt
          ? new Date(siteVisit.scheduledAt).toISOString().slice(0, 16)
          : '',
        notes: siteVisit.notes || '',
        status: siteVisit.status || '',
      });
      if (siteVisit.unit) {
        setSelectedUnit(siteVisit.unit);
      }
      if (siteVisit.inquiry?.contact) {
        // Try to derive project from the existing unit or inquiry
        setSelectedInquiryProjectId(siteVisit.unit?.project?.id || '');
      }
    }
  }, [siteVisit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');

    // When inquiry changes, find its project
    if (name === 'inquiryId') {
      const inq = inquiries.find((i) => i.id === value);
      setSelectedInquiryProjectId(inq?.projectId || '');
      setSelectedUnit(null);
    }
  };

  const validate = () => {
    const errs = {};
    if (!isEdit && !form.inquiryId) errs.inquiryId = 'Inquiry is required';
    if (!form.scheduledAt) errs.scheduledAt = 'Scheduled date/time is required';
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
        const updateData = {
          scheduledAt: form.scheduledAt,
          notes: form.notes || undefined,
          unitId: selectedUnit?.id || undefined,
        };
        if (form.status) updateData.status = form.status;
        await siteVisitService.updateSiteVisit(siteVisit.id, updateData);
      } else {
        await siteVisitService.createSiteVisit({
          inquiryId: form.inquiryId,
          scheduledAt: form.scheduledAt,
          notes: form.notes || undefined,
          unitId: selectedUnit?.id || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save site visit');
    } finally {
      setSubmitting(false);
    }
  };

  const inquiryOptions = inquiries.map((inq) => ({
    value: inq.id,
    label: `${inq.contact?.fullName || 'Unknown'} — ${inq.project?.name || 'No project'} (${inq.stage})`,
  }));

  const STATUS_OPTIONS = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'RESCHEDULED', label: 'Rescheduled' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save Changes' : 'Schedule Visit'}
      submitting={submitting}
    >
      {!isEdit && (
        <Select
          label="Inquiry"
          name="inquiryId"
          value={form.inquiryId}
          onChange={handleChange}
          options={inquiryOptions}
          required
          error={errors.inquiryId}
          placeholder="Select an inquiry..."
        />
      )}

      <Input
        label="Scheduled Date & Time"
        name="scheduledAt"
        type="datetime-local"
        value={form.scheduledAt}
        onChange={handleChange}
        required
        error={errors.scheduledAt}
      />

      {isEdit && (
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
          placeholder="Keep current status"
        />
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Any notes about the visit..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      {/* Unit picker — shown if there's a project context */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Select Unit (optional)
        </p>
        {selectedInquiryProjectId ? (
          <>
            {selectedUnit && (
              <div className="mb-2 flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <span className="font-medium text-primary">
                  Selected: Unit {selectedUnit.unitNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear
                </button>
              </div>
            )}
            <UnitAvailabilityList
              projectId={selectedInquiryProjectId}
              selectedUnitId={selectedUnit?.id}
              onSelect={(unit) => setSelectedUnit(unit)}
            />
          </>
        ) : (
          <p className="text-xs text-gray-400">
            {isEdit
              ? "Unit selection is based on the inquiry's project."
              : 'Select an inquiry linked to a project to see available units.'}
          </p>
        )}
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default SiteVisitForm;
