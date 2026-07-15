import { useState, useEffect } from 'react';
import siteVisitService from '../../services/siteVisitService';
import inquiryService from '../../services/inquiryService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';
import Textarea from '../../components/shared/Textarea';
import UnitAvailabilityList from '../../components/shared/UnitAvailabilityList';
import FormError from '../../components/shared/FormError';
import { showSuccess } from '../../lib/toast';

/**
 * SiteVisitForm — create or reschedule a site visit.
 * When siteVisit prop is provided, operates in edit/reschedule mode.
 *
 * A customer may be interested in several units of the same property before
 * deciding — the unit picker is multi-select and every selected unit is
 * stored against the visit as its "interested units".
 */
const SiteVisitForm = ({ siteVisit, onSuccess, onCancel }) => {
  const isEdit = !!siteVisit;

  const [form, setForm] = useState({
    inquiryId: '',
    scheduledAt: '',
    notes: '',
    status: '',
  });
  const [selectedUnits, setSelectedUnits] = useState([]);
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
      setSelectedUnits(siteVisit.units || []);
      // Project context comes straight from the inquiry now, so the picker
      // still shows available units even if no unit was selected yet.
      setSelectedInquiryProjectId(siteVisit.inquiry?.projectId || '');
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
      setSelectedUnits([]);
    }
  };

  const toggleUnit = (unit) => {
    setSelectedUnits((prev) =>
      prev.some((u) => u.id === unit.id) ? prev.filter((u) => u.id !== unit.id) : [...prev, unit]
    );
  };

  const removeUnit = (unitId) => {
    setSelectedUnits((prev) => prev.filter((u) => u.id !== unitId));
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
      const unitIds = selectedUnits.map((u) => u.id);
      if (isEdit) {
        const updateData = {
          scheduledAt: form.scheduledAt,
          notes: form.notes || undefined,
          unitIds,
        };
        if (form.status) updateData.status = form.status;
        await siteVisitService.updateSiteVisit(siteVisit.id, updateData);
      } else {
        await siteVisitService.createSiteVisit({
          inquiryId: form.inquiryId,
          scheduledAt: form.scheduledAt,
          notes: form.notes || undefined,
          unitIds,
        });
      }
      showSuccess(isEdit ? 'Site visit updated successfully' : 'Site visit scheduled successfully');
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

      <Textarea
        label="Notes (optional)"
        name="notes"
        value={form.notes}
        onChange={handleChange}
        rows={3}
        placeholder="Any notes about the visit..."
      />

      {/* Unit picker — shown if there's a project context. Multi-select: a
          customer may be interested in more than one unit before deciding. */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Interested Units (optional, select any number)
        </p>
        {selectedInquiryProjectId ? (
          <>
            {selectedUnits.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedUnits.map((unit) => (
                  <span
                    key={unit.id}
                    className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-primary/5 border border-primary/20 rounded-full text-xs font-medium text-primary"
                  >
                    Unit {unit.unitNumber}
                    <button
                      type="button"
                      onClick={() => removeUnit(unit.id)}
                      className="text-primary/60 hover:text-primary transition-colors duration-150 ease-snappy"
                      aria-label={`Remove unit ${unit.unitNumber}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <UnitAvailabilityList
              projectId={selectedInquiryProjectId}
              multiple
              selectedUnitIds={selectedUnits.map((u) => u.id)}
              onToggle={toggleUnit}
              showPrice={false}
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

      <FormError message={apiError} />
    </FormLayout>
  );
};

export default SiteVisitForm;
