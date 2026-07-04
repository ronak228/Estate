import { useState } from 'react';
import { Edit2, Save, X, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Select from './Select';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

const STATUS_ICONS = {
  PENDING: Clock,
  IN_PROGRESS: Loader,
  COMPLETED: CheckCircle,
  FAILED: AlertCircle,
};

const CHECKS = [
  {
    key: 'inspection',
    label: 'Property Inspection',
    statusField: 'inspectionStatus',
    notesField: 'inspectionNotes',
  },
  {
    key: 'appraisal',
    label: 'Property Appraisal',
    statusField: 'appraisalStatus',
    notesField: 'appraisalNotes',
  },
  {
    key: 'legal',
    label: 'Legal Verification',
    statusField: 'legalVerificationStatus',
    notesField: 'legalVerificationNotes',
  },
];

/**
 * DueDiligenceTracker — three-row status display for the three due diligence checks.
 * Shows status badge + notes. Managers can edit inline.
 *
 * Props:
 *   dueDiligence  — DueDiligence record (may be null if not created yet)
 *   onSave        — async (data) => void — called with partial update payload
 *   canEdit       — boolean (ADMIN/MANAGER only)
 *   saving        — boolean
 *   saveError     — string
 */
const DueDiligenceTracker = ({
  dueDiligence,
  onSave,
  canEdit = false,
  saving = false,
  saveError = '',
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    inspectionStatus: dueDiligence?.inspectionStatus || 'PENDING',
    inspectionNotes: dueDiligence?.inspectionNotes || '',
    appraisalStatus: dueDiligence?.appraisalStatus || 'PENDING',
    appraisalNotes: dueDiligence?.appraisalNotes || '',
    legalVerificationStatus: dueDiligence?.legalVerificationStatus || 'PENDING',
    legalVerificationNotes: dueDiligence?.legalVerificationNotes || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    // Sync form with latest record before opening editor
    setForm({
      inspectionStatus: dueDiligence?.inspectionStatus || 'PENDING',
      inspectionNotes: dueDiligence?.inspectionNotes || '',
      appraisalStatus: dueDiligence?.appraisalStatus || 'PENDING',
      appraisalNotes: dueDiligence?.appraisalNotes || '',
      legalVerificationStatus: dueDiligence?.legalVerificationStatus || 'PENDING',
      legalVerificationNotes: dueDiligence?.legalVerificationNotes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  return (
    <div className="flex flex-col gap-3">
      {CHECKS.map((check) => {
        const statusValue = editing
          ? form[check.statusField]
          : (dueDiligence?.[check.statusField] || 'PENDING');
        const notesValue = editing
          ? form[check.notesField]
          : (dueDiligence?.[check.notesField] || '');
        const StatusIcon = STATUS_ICONS[statusValue] || Clock;

        return (
          <div
            key={check.key}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <StatusIcon
                size={16}
                className={
                  statusValue === 'COMPLETED'
                    ? 'text-emerald-500 mt-0.5 flex-shrink-0'
                    : statusValue === 'FAILED'
                    ? 'text-red-500 mt-0.5 flex-shrink-0'
                    : statusValue === 'IN_PROGRESS'
                    ? 'text-blue-500 mt-0.5 flex-shrink-0'
                    : 'text-gray-400 mt-0.5 flex-shrink-0'
                }
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{check.label}</span>
                  {!editing && <StatusBadge value={statusValue} size="xs" />}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <Select
                      name={check.statusField}
                      value={form[check.statusField]}
                      onChange={handleChange}
                      options={STATUS_OPTIONS}
                      placeholder="Select status..."
                    />
                    <textarea
                      name={check.notesField}
                      value={form[check.notesField]}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Notes (optional)..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                  </div>
                ) : (
                  notesValue && (
                    <p className="text-xs text-gray-500 italic mt-0.5">"{notesValue}"</p>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}

      {saveError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2 pt-1">
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary px-3 py-1.5 rounded-lg border border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Edit2 size={14} />
              {dueDiligence ? 'Edit Status' : 'Initialise Due Diligence'}
            </button>
          )}
        </div>
      )}

      {!dueDiligence && !editing && (
        <p className="text-sm text-gray-400 text-center py-2">
          No due diligence record yet.
          {canEdit ? ' Click "Initialise Due Diligence" to start.' : ''}
        </p>
      )}
    </div>
  );
};

export default DueDiligenceTracker;
