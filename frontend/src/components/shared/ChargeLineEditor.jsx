import { Plus, Trash2 } from 'lucide-react';
import Button from './Button';

/**
 * ChargeLineEditor — add/remove additional charge rows in QuotationForm.
 * Each charge has a label (e.g. "Registration Charges") and an amount.
 *
 * Props:
 *   charges   — array of { label: string, amount: string }
 *   onChange  — (newCharges) => void
 */
const ChargeLineEditor = ({ charges = [], onChange }) => {
  const addCharge = () => {
    onChange([...charges, { label: '', amount: '' }]);
  };

  const removeCharge = (index) => {
    onChange(charges.filter((_, i) => i !== index));
  };

  const updateCharge = (index, field, value) => {
    const updated = charges.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Additional Charges</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={Plus}
          onClick={addCharge}
        >
          Add Charge
        </Button>
      </div>

      {charges.length === 0 && (
        <p className="text-xs text-gray-400 py-1">
          No additional charges. Click "Add Charge" to add one.
        </p>
      )}

      {charges.map((charge, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={charge.label}
            onChange={(e) => updateCharge(index, 'label', e.target.value)}
            placeholder="Label (e.g. Registration Charges)"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <input
            type="number"
            value={charge.amount}
            onChange={(e) => updateCharge(index, 'amount', e.target.value)}
            placeholder="Amount"
            min="0"
            className="w-36 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => removeCharge(index)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            aria-label="Remove charge"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChargeLineEditor;
