import { useState, useEffect } from 'react';
import unitService from '../../services/unitService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import { formatCurrency } from '../../utils/format';

/**
 * UnitForm — create or edit a unit within a project.
 *
 * User inputs: unitNumber, width, length, pricePerSqFt
 * Auto-calculated (live, read-only): area, basePrice
 * Backend always recalculates on save — frontend calc is display-only.
 */
const UnitForm = ({ unit, projectId, onSuccess, onCancel }) => {
  const isEdit = !!unit;

  const [form, setForm] = useState({
    unitNumber: '',
    width: '',
    length: '',
    pricePerSqFt: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derived display values — live calculation, never sent to server
  const widthNum = parseFloat(form.width) || 0;
  const lengthNum = parseFloat(form.length) || 0;
  const pricePerSqFtNum = parseFloat(form.pricePerSqFt) || 0;
  const derivedArea = widthNum * lengthNum;
  const derivedBasePrice = derivedArea * pricePerSqFtNum;
  const hasCalc = derivedArea > 0 && derivedBasePrice > 0;

  useEffect(() => {
    if (unit) {
      setForm({
        unitNumber: unit.unitNumber || '',
        width: unit.width != null ? String(unit.width) : '',
        length: unit.length != null ? String(unit.length) : '',
        pricePerSqFt: unit.pricePerSqFt != null ? String(unit.pricePerSqFt) : '',
      });
    }
  }, [unit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.unitNumber.trim()) errs.unitNumber = 'Unit number is required';
    if (!form.width || parseFloat(form.width) <= 0) errs.width = 'Width must be a positive number';
    if (!form.length || parseFloat(form.length) <= 0) errs.length = 'Length must be a positive number';
    if (!form.pricePerSqFt || parseFloat(form.pricePerSqFt) <= 0) {
      errs.pricePerSqFt = 'Price per sq. ft. must be a positive number';
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
      const payload = {
        unitNumber: form.unitNumber.trim(),
        width: parseFloat(form.width),
        length: parseFloat(form.length),
        pricePerSqFt: parseFloat(form.pricePerSqFt),
      };

      if (isEdit) {
        await unitService.updateUnit(unit.id, payload);
      } else {
        await unitService.createUnit({ projectId, ...payload });
      }
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save unit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save Changes' : 'Add Unit'}
      submitting={submitting}
    >
      {/* Unit Number */}
      <Input
        label="Unit Number"
        name="unitNumber"
        value={form.unitNumber}
        onChange={handleChange}
        required
        error={errors.unitNumber}
        placeholder="e.g. A-101"
      />

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Width (ft)"
          name="width"
          type="number"
          value={form.width}
          onChange={handleChange}
          required
          error={errors.width}
          placeholder="e.g. 20"
          min="0.01"
          step="0.01"
        />
        <Input
          label="Length (ft)"
          name="length"
          type="number"
          value={form.length}
          onChange={handleChange}
          required
          error={errors.length}
          placeholder="e.g. 38"
          min="0.01"
          step="0.01"
        />
      </div>

      {/* Price per sq ft */}
      <Input
        label="Price per Sq. Ft. (₹)"
        name="pricePerSqFt"
        type="number"
        value={form.pricePerSqFt}
        onChange={handleChange}
        required
        error={errors.pricePerSqFt}
        placeholder="e.g. 5000"
        min="0.01"
        step="0.01"
      />

      {/* Live Calculation Preview */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Auto Calculation
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Area ({form.width || '—'} × {form.length || '—'} ft)
          </span>
          <span className="text-sm font-medium text-gray-800">
            {derivedArea > 0 ? `${derivedArea.toLocaleString('en-IN')} sq. ft.` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <span className="text-sm font-semibold text-gray-700">Base Price</span>
          <span className={`text-sm font-bold ${hasCalc ? 'text-primary' : 'text-gray-400'}`}>
            {hasCalc ? formatCurrency(derivedBasePrice) : '—'}
          </span>
        </div>
        <p className="text-xs text-gray-400">Base Price is read-only — calculated by the server on save.</p>
      </div>

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default UnitForm;
