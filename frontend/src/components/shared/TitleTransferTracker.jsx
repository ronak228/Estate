import { useState } from 'react';
import { Edit2, Save, X, CheckCircle, Clock, Loader } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Select from './Select';
import { formatDate, formatDateTime } from '../../utils/format';

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_ICONS = {
  NOT_STARTED: Clock,
  IN_PROGRESS: Loader,
  COMPLETED: CheckCircle,
};

/**
 * TitleTransferTracker — single-row status display with edit control.
 * Same visual style as DueDiligenceTracker.jsx from Module 5.
 *
 * Props:
 *   titleTransfer — TitleTransfer record (may be null if not created yet)
 *   onSave        — async (data) => void — called for both create and update
 *   canEdit       — boolean (ADMIN/MANAGER only)
 *   saving        — boolean
 *   saveError     — string
 */
const TitleTransferTracker = ({
  titleTransfer,
  onSave,
  canEdit = false,
  saving = false,
  saveError = '',
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    status: titleTransfer?.status || 'NOT_STARTED',
    notes: titleTransfer?.notes || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setForm({
      status: titleTransfer?.status || 'NOT_STARTED',
      notes: titleTransfer?.notes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  const currentStatus = titleTransfer?.status || 'NOT_STARTED';
  const StatusIcon = STATUS_ICONS[currentStatus] || Clock;

  return (
    <div className="flex flex-col gap-3">
      {/* Status display row */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-4">
        <div className="flex items-start gap-3">
          <StatusIcon
            size={18}
            className={
              currentStatus === 'COMPLETED'
                ? 'text-emerald-500 mt-0.5 flex-shrink-0'
                : currentStatus === 'IN_PROGRESS'
                ? 'text-blue-500 mt-0.5 flex-shrink-0 animate-spin'
                : 'text-gray-400 mt-0.5 flex-shrink-0'
            }
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">Title Transfer</span>
              {!editing && <StatusBadge value={currentStatus} />}
            </div>

            {editing ? (
              <div className="flex flex-col gap-3 mt-2">
                <Select
                  label="Transfer Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="e.g. Documents submitted to sub-registrar office"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
              </div>
            ) : (
              <>
                {titleTransfer?.completedAt && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    Completed: {formatDateTime(titleTransfer.completedAt)}
                  </p>
                )}
                {titleTransfer?.notes && (
                  <p className="text-xs text-gray-500 italic mt-0.5">
                    "{titleTransfer.notes}"
                  </p>
                )}
                {!titleTransfer && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    No title transfer record yet.
                  </p>
                )}
                {titleTransfer && (
                  <p className="text-xs text-gray-400 mt-1">
                    Initiated: {formatDate(titleTransfer.createdAt)}
                    {titleTransfer.createdBy && ` · ${titleTransfer.createdBy.fullName}`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {saveError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary px-3 py-1.5 rounded-lg border border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Edit2 size={14} />
              {titleTransfer ? 'Update Transfer' : 'Initiate Transfer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TitleTransferTracker;
