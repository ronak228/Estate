import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import unitService from '../../services/unitService';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import FormLayout from '../../components/shared/FormLayout';
import FormError from '../../components/shared/FormError';
import { showSuccess } from '../../lib/toast';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import { isPositiveInteger } from '../../utils/validation';
import { calcAreaAndBasePrice } from '../../utils/unitCalc';
import {
  buildDefaultSuffixes,
  generateUnitNumbers,
  MAX_BULK_UNITS,
} from '../../utils/unitNumberGenerator';

/**
 * BulkUnitForm — two-step "Bulk Add Units" flow:
 *  1. Config: floor range + units/floor + naming pattern + common unit details.
 *  2. Preview: every generated unit shown in an editable table (unit number,
 *     width, length, price/sqft) so the admin can fix or drop rows before the
 *     single bulk-create request fires. Nothing is saved until that submit.
 */
const BulkUnitForm = ({ projectId, existingUnitNumbers = [], onSuccess, onCancel }) => {
  const [step, setStep] = useState('config');

  const [config, setConfig] = useState({
    startFloor: '1',
    endFloor: '10',
    unitsPerFloor: '4',
    suffixes: buildDefaultSuffixes(4).join(','),
    unitType: '',
    width: '',
    length: '',
    pricePerSqFt: '',
  });
  const [suffixesTouched, setSuffixesTouched] = useState(false);
  const [configErrors, setConfigErrors] = useState({});

  const [rows, setRows] = useState([]); // [{ unitNumber, width, length, pricePerSqFt, floor }]
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const existingSet = new Set(existingUnitNumbers.map((n) => n.trim()));

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfigErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');

    setConfig((prev) => {
      const next = { ...prev, [name]: value };
      // Keep the suffix list in sync with "units per floor" until the admin
      // customizes it by hand — after that, respect their edits.
      if (name === 'unitsPerFloor' && !suffixesTouched) {
        next.suffixes = buildDefaultSuffixes(value).join(',');
      }
      return next;
    });

    if (name === 'suffixes') setSuffixesTouched(true);
  };

  const validateConfig = () => {
    const errs = {};
    const startFloor = parseInt(config.startFloor, 10);
    const endFloor = parseInt(config.endFloor, 10);
    const unitsPerFloor = parseInt(config.unitsPerFloor, 10);
    const suffixList = config.suffixes.split(',').map((s) => s.trim()).filter(Boolean);

    if (!Number.isInteger(startFloor)) errs.startFloor = 'Starting floor is required';
    if (!Number.isInteger(endFloor)) errs.endFloor = 'Ending floor is required';
    if (Number.isInteger(startFloor) && Number.isInteger(endFloor) && endFloor < startFloor) {
      errs.endFloor = 'Ending floor must be greater than or equal to starting floor';
    }
    if (!isPositiveInteger(unitsPerFloor)) errs.unitsPerFloor = 'Units per floor must be a positive whole number';
    if (isPositiveInteger(unitsPerFloor) && suffixList.length !== unitsPerFloor) {
      errs.suffixes = `Enter exactly ${unitsPerFloor} comma-separated suffixes (one per unit on a floor)`;
    }
    if (new Set(suffixList).size !== suffixList.length) {
      errs.suffixes = 'Suffixes must be unique';
    }
    if (!config.width || parseFloat(config.width) <= 0) errs.width = 'Width must be a positive number';
    if (!config.length || parseFloat(config.length) <= 0) errs.length = 'Length must be a positive number';
    if (!isPositiveInteger(config.pricePerSqFt)) {
      errs.pricePerSqFt = 'Price per sq. ft. must be a positive whole number';
    }

    if (
      Number.isInteger(startFloor) &&
      Number.isInteger(endFloor) &&
      endFloor >= startFloor &&
      isPositiveInteger(unitsPerFloor)
    ) {
      const total = (endFloor - startFloor + 1) * unitsPerFloor;
      if (total > MAX_BULK_UNITS) {
        errs.unitsPerFloor = `This would generate ${total} units — the limit is ${MAX_BULK_UNITS} per batch`;
      }
    }

    return errs;
  };

  const handleGeneratePreview = (e) => {
    e.preventDefault();
    const errs = validateConfig();
    if (Object.keys(errs).length) { setConfigErrors(errs); return; }

    const startFloor = parseInt(config.startFloor, 10);
    const endFloor = parseInt(config.endFloor, 10);
    const suffixList = config.suffixes.split(',').map((s) => s.trim()).filter(Boolean);

    const generated = generateUnitNumbers({ startFloor, endFloor, suffixes: suffixList });
    setRows(
      generated.map(({ floor, unitNumber }) => ({
        floor,
        unitNumber,
        unitType: config.unitType,
        width: config.width,
        length: config.length,
        pricePerSqFt: config.pricePerSqFt,
      }))
    );
    setApiError('');
    setStep('preview');
  };

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Per-row validation, recomputed on every render so edits reflect immediately.
  const rowIssues = rows.map((row, index) => {
    if (!row.unitNumber.trim()) return 'Unit number is required';
    if (existingSet.has(row.unitNumber.trim())) return 'Already exists in this project';
    const dupIndex = rows.findIndex((r, i) => i !== index && r.unitNumber.trim() === row.unitNumber.trim());
    if (dupIndex !== -1) return 'Duplicate in this batch';
    if (!row.width || Number(row.width) <= 0) return 'Width must be positive';
    if (!row.length || Number(row.length) <= 0) return 'Length must be positive';
    if (!isPositiveInteger(row.pricePerSqFt)) return 'Price/sqft must be a positive whole number';
    return null;
  });

  const hasRowErrors = rowIssues.some(Boolean);

  const handleSubmit = async () => {
    if (!rows.length || hasRowErrors) return;
    setSubmitting(true);
    setApiError('');
    try {
      await unitService.bulkCreateUnits({
        projectId,
        units: rows.map((row) => ({
          unitNumber: row.unitNumber.trim(),
          floor: row.floor,
          unitType: row.unitType?.trim() || null,
          width: parseFloat(row.width),
          length: parseFloat(row.length),
          pricePerSqFt: parseInt(row.pricePerSqFt, 10),
        })),
      });
      showSuccess(`${rows.length} unit${rows.length === 1 ? '' : 's'} created successfully`);
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to create units');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'config') {
    return (
      <FormLayout
        onSubmit={handleGeneratePreview}
        onCancel={onCancel}
        submitLabel="Generate Preview"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Starting Floor"
            name="startFloor"
            type="number"
            value={config.startFloor}
            onChange={handleConfigChange}
            required
            error={configErrors.startFloor}
            step="1"
          />
          <Input
            label="Ending Floor"
            name="endFloor"
            type="number"
            value={config.endFloor}
            onChange={handleConfigChange}
            required
            error={configErrors.endFloor}
            step="1"
          />
        </div>

        <Input
          label="Units per Floor"
          name="unitsPerFloor"
          type="number"
          value={config.unitsPerFloor}
          onChange={handleConfigChange}
          required
          error={configErrors.unitsPerFloor}
          min="1"
          step="1"
        />

        <Input
          label="Unit Number Suffixes"
          name="suffixes"
          value={config.suffixes}
          onChange={handleConfigChange}
          required
          error={configErrors.suffixes}
          placeholder="e.g. 01,02,03,04"
        />
        <p className="-mt-3 text-xs text-gray-400">
          One suffix per unit on a floor. Unit number = floor + suffix (floor 1 → 101,102,103,104; floor 10 → 1001,1002,1003,1004).
        </p>

        <Input
          label="Unit Type (optional)"
          name="unitType"
          value={config.unitType}
          onChange={handleConfigChange}
          placeholder="e.g. 2BHK"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Width (ft)"
            name="width"
            type="number"
            value={config.width}
            onChange={handleConfigChange}
            required
            error={configErrors.width}
            placeholder="e.g. 20"
            min="0.01"
            step="0.01"
          />
          <Input
            label="Length (ft)"
            name="length"
            type="number"
            value={config.length}
            onChange={handleConfigChange}
            required
            error={configErrors.length}
            placeholder="e.g. 38"
            min="0.01"
            step="0.01"
          />
        </div>

        <Input
          label={`Price per Sq. Ft. (${getCurrencySymbol()})`}
          name="pricePerSqFt"
          type="number"
          value={config.pricePerSqFt}
          onChange={handleConfigChange}
          required
          error={configErrors.pricePerSqFt}
          placeholder="e.g. 5000"
          min="1"
          step="1"
        />

        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Common width, length, and price apply to every generated unit — edit individual rows on the next screen before saving.
        </p>
      </FormLayout>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{rows.length}</span> unit{rows.length === 1 ? '' : 's'} ready to create
        </p>
        <Button variant="link" size="sm" onClick={() => setStep('config')}>
          Back to Config
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[50vh]">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Unit No.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Floor</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Width</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Length</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{getCurrencySymbol()}/sq.ft.</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Base Price</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => {
              const issue = rowIssues[index];
              const { basePrice } = calcAreaAndBasePrice(row.width, row.length, row.pricePerSqFt);
              return (
                <tr key={`${row.floor}-${index}`} className={issue ? 'bg-red-50' : ''}>
                  <td className="px-2 py-1.5 w-32">
                    <input
                      value={row.unitNumber}
                      onChange={(e) => updateRow(index, 'unitNumber', e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-1.5 w-16 text-gray-600">{row.floor}</td>
                  <td className="px-2 py-1.5 w-24">
                    <input
                      type="number"
                      value={row.width}
                      onChange={(e) => updateRow(index, 'width', e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      step="0.01"
                    />
                  </td>
                  <td className="px-2 py-1.5 w-24">
                    <input
                      type="number"
                      value={row.length}
                      onChange={(e) => updateRow(index, 'length', e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      step="0.01"
                    />
                  </td>
                  <td className="px-2 py-1.5 w-28">
                    <input
                      type="number"
                      value={row.pricePerSqFt}
                      onChange={(e) => updateRow(index, 'pricePerSqFt', e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      step="1"
                    />
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-700">
                    {basePrice > 0 ? formatCurrency(basePrice) : '—'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {issue ? (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle size={12} /> {issue}
                      </span>
                    ) : (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => removeRow(index)}
                        className="!text-gray-400 hover:!text-danger"
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FormError message={apiError} className="mt-3" />

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!rows.length || hasRowErrors}
        >
          Create {rows.length} Unit{rows.length === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
};

export default BulkUnitForm;
