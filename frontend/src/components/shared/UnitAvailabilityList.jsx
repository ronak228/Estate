import { useState, useEffect } from 'react';
import { CheckCircle, Building2 } from 'lucide-react';
import unitService from '../../services/unitService';
import StatusBadge from './StatusBadge';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import { formatCurrency } from '../../utils/format';

/**
 * UnitAvailabilityList — read-only unit picker.
 * Shows available units (filtered by projectId if provided).
 * When selectedUnitId + onSelect are provided, allows picking a unit.
 * Reused in Module 3's quotation flow.
 */
const UnitAvailabilityList = ({
  projectId,
  selectedUnitId,
  onSelect,
  readOnly = false,
}) => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    unitService
      .listUnits({ projectId: projectId || undefined, status: 'AVAILABLE' })
      .then(setUnits)
      .catch(() => setError('Failed to load units'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <LoadingState label="Loading available units..." />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;
  if (units.length === 0) {
    return <EmptyState message="No available units found" icon={Building2} />;
  }

  return (
    <ul className="space-y-2">
      {units.map((unit) => {
        const isSelected = selectedUnitId === unit.id;
        return (
          <li
            key={unit.id}
            onClick={!readOnly && onSelect ? () => onSelect(unit) : undefined}
            className={`
              flex items-center justify-between p-3 rounded-lg border transition-colors
              ${!readOnly && onSelect ? 'cursor-pointer' : ''}
              ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : !readOnly && onSelect
                  ? 'border-gray-200 hover:border-primary hover:bg-gray-50'
                  : 'border-gray-200 bg-white'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {!readOnly && onSelect && (
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Unit {unit.unitNumber}
                </p>
                <p className="text-xs text-gray-500">
                  {unit.project?.name}
                  {unit.project?.location ? ` — ${unit.project.location}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-800">
                {formatCurrency(unit.basePrice)}
              </span>
              <StatusBadge value={unit.status} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default UnitAvailabilityList;
