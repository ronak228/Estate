import { useState, useEffect } from 'react';
import { Building2, Check } from 'lucide-react';
import unitService from '../../services/unitService';
import StatusBadge from './StatusBadge';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import { formatCurrency } from '../../utils/format';

/**
 * UnitAvailabilityList — read-only unit picker.
 * Fetches available units for `projectId` unless a pre-loaded `units` array
 * is passed in (e.g. a curated "units of interest" list), in which case that
 * list is rendered as-is with no fetch.
 *
 * Single-select (default): pass selectedUnitId + onSelect.
 * Multi-select: pass multiple + selectedUnitIds + onToggle.
 *
 * Reused in the Schedule Site Visit and Quotation flows.
 */
const UnitAvailabilityList = ({
  projectId,
  units: providedUnits,
  selectedUnitId,
  onSelect,
  multiple = false,
  selectedUnitIds = [],
  onToggle,
  showPrice = true,
  readOnly = false,
  emptyMessage = 'No available units found',
}) => {
  const [units, setUnits] = useState(providedUnits || []);
  const [loading, setLoading] = useState(!providedUnits);
  const [error, setError] = useState('');

  useEffect(() => {
    if (providedUnits) {
      setUnits(providedUnits);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    unitService
      .listUnits({ projectId: projectId || undefined, status: 'AVAILABLE' })
      .then(setUnits)
      .catch(() => setError('Failed to load units'))
      .finally(() => setLoading(false));
  }, [projectId, providedUnits]);

  if (loading) return <LoadingState label="Loading available units..." />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;
  if (units.length === 0) {
    return <EmptyState message={emptyMessage} icon={Building2} />;
  }

  const isInteractive = !readOnly && (multiple ? !!onToggle : !!onSelect);

  return (
    <ul className="space-y-2">
      {units.map((unit) => {
        const isSelected = multiple ? selectedUnitIds.includes(unit.id) : selectedUnitId === unit.id;
        const handleClick = () => {
          if (!isInteractive) return;
          if (multiple) onToggle(unit);
          else onSelect(unit);
        };
        return (
          <li
            key={unit.id}
            onClick={isInteractive ? handleClick : undefined}
            className={`
              flex items-center justify-between p-3 rounded-lg border transition-colors
              ${isInteractive ? 'cursor-pointer' : ''}
              ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : isInteractive
                  ? 'border-gray-200 hover:border-primary hover:bg-gray-50'
                  : 'border-gray-200 bg-white'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {isInteractive && (
                <div
                  className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 ${
                    multiple ? 'rounded' : 'rounded-full'
                  } ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}
                >
                  {isSelected && (multiple
                    ? <Check size={11} className="text-white" strokeWidth={3} />
                    : <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Unit {unit.unitNumber}
                  {unit.unitType ? <span className="text-gray-500 font-normal"> · {unit.unitType}</span> : ''}
                </p>
                <p className="text-xs text-gray-500">
                  {unit.project?.name}
                  {unit.project?.location ? ` — ${unit.project.location}` : ''}
                  {unit.floor != null ? ` · Floor ${unit.floor}` : ''}
                  {unit.area != null ? ` · ${Number(unit.area).toLocaleString('en-IN')} sq. ft.` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {showPrice && (
                <span className="text-sm font-semibold text-gray-800">
                  {formatCurrency(unit.basePrice)}
                </span>
              )}
              <StatusBadge value={unit.status} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default UnitAvailabilityList;
