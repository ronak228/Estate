import { useState, useEffect } from 'react';
import quotationService from '../../services/quotationService';
import inquiryService from '../../services/inquiryService';
import siteVisitService from '../../services/siteVisitService';
import unitService from '../../services/unitService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';
import UnitAvailabilityList from '../../components/shared/UnitAvailabilityList';
import ChargeLineEditor from '../../components/shared/ChargeLineEditor';
import { isNonNegativeInteger } from '../../utils/validation';

/**
 * QuotationForm — create a new quotation against an inquiry.
 * Re-quoting is always a new row — this form never edits an existing quotation.
 *
 * Props:
 *   defaultInquiryId — pre-fill inquiry when opened from inquiry detail
 *   onSuccess         — () => void
 *   onCancel          — () => void
 */
const QuotationForm = ({ defaultInquiryId, onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    inquiryId: defaultInquiryId || '',
    validUntil: '',
  });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [charges, setCharges] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiryProjectId, setSelectedInquiryProjectId] = useState('');
  const [projectUnits, setProjectUnits] = useState([]);
  const [interestedUnitIds, setInterestedUnitIds] = useState(new Set());

  // Full available-unit records for the project (with pricing) — the single
  // source of truth for both "units of interest" and "all available" below.
  useEffect(() => {
    if (!selectedInquiryProjectId) { setProjectUnits([]); return; }
    unitService
      .listUnits({ projectId: selectedInquiryProjectId, status: 'AVAILABLE' })
      .then(setProjectUnits)
      .catch(() => setProjectUnits([]));
  }, [selectedInquiryProjectId]);

  // Surface units the customer already toured (site visits) so the final
  // unit for this quotation can be picked from what they showed interest in.
  useEffect(() => {
    if (!form.inquiryId) { setInterestedUnitIds(new Set()); return; }
    siteVisitService
      .listSiteVisits({ inquiryId: form.inquiryId, pageSize: 100 })
      .then((data) => {
        const ids = new Set();
        (data.items || []).forEach((visit) => {
          (visit.units || []).forEach((unit) => ids.add(unit.id));
        });
        setInterestedUnitIds(ids);
      })
      .catch(() => setInterestedUnitIds(new Set()));
  }, [form.inquiryId]);

  const interestedUnits = projectUnits.filter((u) => interestedUnitIds.has(u.id));

  useEffect(() => {
    inquiryService
      .listInquiries({ pageSize: 100 })
      .then((data) => {
        const items = data.items || [];
        setInquiries(items);

        // If we have a default inquiry, pre-populate its project
        if (defaultInquiryId) {
          const inq = items.find((i) => i.id === defaultInquiryId);
          if (inq?.projectId) setSelectedInquiryProjectId(inq.projectId);
        }
      })
      .catch(() => {});
  }, [defaultInquiryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');

    if (name === 'inquiryId') {
      const inq = inquiries.find((i) => i.id === value);
      setSelectedInquiryProjectId(inq?.projectId || '');
      setSelectedUnit(null);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.inquiryId) errs.inquiryId = 'Inquiry is required';
    if (!selectedUnit) errs.unit = 'Please select a unit';
    for (const c of charges) {
      if (!c.label.trim()) {
        errs.charges = 'All charges must have a label';
        break;
      }
      if (c.amount === '' || !isNonNegativeInteger(c.amount)) {
        errs.charges = 'All charges must have a non-negative whole number amount';
        break;
      }
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
      await quotationService.createQuotation({
        inquiryId: form.inquiryId,
        unitId: selectedUnit.id,
        charges: charges.map((c) => ({ label: c.label.trim(), amount: parseInt(c.amount, 10) })),
        validUntil: form.validUntil || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const inquiryOptions = inquiries.map((inq) => ({
    value: inq.id,
    label: `${inq.contact?.fullName || 'Unknown'} — ${inq.project?.name || 'No project'} (${inq.stage})`,
  }));

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Generate Quotation"
      submitting={submitting}
    >
      {/* Inquiry selector — hidden if pre-filled from inquiry detail */}
      {!defaultInquiryId ? (
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
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
          Creating quotation for:{' '}
          <span className="font-medium text-gray-800">
            {inquiries.find((i) => i.id === defaultInquiryId)?.contact?.fullName || 'Loading...'}
          </span>
        </div>
      )}

      <Input
        label="Valid Until (optional)"
        name="validUntil"
        type="date"
        value={form.validUntil}
        onChange={handleChange}
      />

      {/* Unit picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Select Unit <span className="text-red-500">*</span>
          </label>
        </div>
        {errors.unit && <p className="text-xs text-red-600">{errors.unit}</p>}
        {selectedInquiryProjectId ? (
          <>
            {selectedUnit && (
              <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <span className="font-medium text-primary">
                  Selected: Unit {selectedUnit.unitNumber} — {selectedUnit.project?.name}
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

            {interestedUnits.length > 0 && (
              <div className="flex flex-col gap-2 mb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Units of Interest (from Site Visits)
                </p>
                <UnitAvailabilityList
                  units={interestedUnits}
                  selectedUnitId={selectedUnit?.id}
                  onSelect={(unit) => {
                    setSelectedUnit(unit);
                    setErrors((prev) => ({ ...prev, unit: '' }));
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {interestedUnits.length > 0 && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  All Available Units
                </p>
              )}
              <UnitAvailabilityList
                units={projectUnits}
                selectedUnitId={selectedUnit?.id}
                onSelect={(unit) => {
                  setSelectedUnit(unit);
                  setErrors((prev) => ({ ...prev, unit: '' }));
                }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 py-2">
            {form.inquiryId
              ? 'The selected inquiry has no project linked — unit picker unavailable.'
              : 'Select an inquiry linked to a project to see available units.'}
          </p>
        )}
      </div>

      {/* Additional charges */}
      <div className="border-t border-gray-100 pt-4">
        <ChargeLineEditor charges={charges} onChange={setCharges} />
        {errors.charges && (
          <p className="text-xs text-red-600 mt-1">{errors.charges}</p>
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

export default QuotationForm;
