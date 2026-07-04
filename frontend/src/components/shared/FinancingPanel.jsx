import { useState } from 'react';
import { Edit2, Save, X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Select from './Select';
import Input from './Input';
import { formatCurrency, formatDateTime } from '../../utils/format';

const FINANCING_TYPE_OPTIONS = [
  { value: 'SELF_FUNDED', label: 'Self Funded' },
  { value: 'HOME_LOAN', label: 'Home Loan' },
  { value: 'CONSTRUCTION_LINKED_PLAN', label: 'Construction Linked Plan' },
  { value: 'OTHER', label: 'Other' },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: 'NOT_APPLIED', label: 'Not Applied' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/**
 * FinancingPanel — displays and allows editing of financing details.
 * Shows ERP sync status and a "Sync to ERP" button for ADMIN users.
 *
 * Props:
 *   financing       — Financing record (may be null)
 *   onSave          — async (data) => void — called with full or partial payload
 *   onErpSync       — async () => void — triggers POST .../erp-sync
 *   canEdit         — boolean (ADMIN/MANAGER)
 *   isAdmin         — boolean (ADMIN only — shows ERP sync button)
 *   saving          — boolean
 *   saveError       — string
 *   syncing         — boolean
 *   syncMessage     — string
 */
const FinancingPanel = ({
  financing,
  onSave,
  onErpSync,
  canEdit = false,
  isAdmin = false,
  saving = false,
  saveError = '',
  syncing = false,
  syncMessage = '',
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    type: financing?.type || '',
    approvalStatus: financing?.approvalStatus || 'NOT_APPLIED',
    bankName: financing?.bankName || '',
    loanAmount: financing?.loanAmount != null ? String(Number(financing.loanAmount)) : '',
    notes: financing?.notes || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleEdit = () => {
    setForm({
      type: financing?.type || '',
      approvalStatus: financing?.approvalStatus || 'NOT_APPLIED',
      bankName: financing?.bankName || '',
      loanAmount: financing?.loanAmount != null ? String(Number(financing.loanAmount)) : '',
      notes: financing?.notes || '',
    });
    setErrors({});
    setEditing(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.type) errs.type = 'Financing type is required';
    if (form.loanAmount && (isNaN(Number(form.loanAmount)) || Number(form.loanAmount) < 0)) {
      errs.loanAmount = 'Loan amount must be a non-negative number';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      type: form.type,
      approvalStatus: form.approvalStatus || undefined,
      bankName: form.bankName.trim() || undefined,
      loanAmount: form.loanAmount ? Number(form.loanAmount) : undefined,
      notes: form.notes.trim() || undefined,
    };
    await onSave(payload);
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  if (!financing && !editing) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-gray-400">No financing record yet.</p>
        {canEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
            Add Financing
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        /* ── Edit form ─────────────────────────────────────────────────────── */
        <div className="flex flex-col gap-3">
          <Select
            label="Financing Type"
            name="type"
            value={form.type}
            onChange={handleChange}
            options={FINANCING_TYPE_OPTIONS}
            placeholder="Select type..."
            required
            error={errors.type}
          />
          <Select
            label="Approval Status"
            name="approvalStatus"
            value={form.approvalStatus}
            onChange={handleChange}
            options={APPROVAL_STATUS_OPTIONS}
          />
          <Input
            label="Bank / Lender Name"
            name="bankName"
            value={form.bankName}
            onChange={handleChange}
            placeholder="e.g. HDFC Bank"
          />
          <Input
            label="Loan Amount"
            name="loanAmount"
            type="number"
            min="0"
            step="0.01"
            value={form.loanAmount}
            onChange={handleChange}
            placeholder="e.g. 5000000"
            error={errors.loanAmount}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
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
          </div>
        </div>
      ) : (
        /* ── Read view ─────────────────────────────────────────────────────── */
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Type</dt>
            <dd><StatusBadge value={financing.type} /></dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Approval Status</dt>
            <dd><StatusBadge value={financing.approvalStatus} /></dd>
          </div>
          {financing.bankName && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Bank / Lender</dt>
              <dd className="font-medium text-gray-900">{financing.bankName}</dd>
            </div>
          )}
          {financing.loanAmount != null && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Loan Amount</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(financing.loanAmount)}</dd>
            </div>
          )}
          {financing.notes && (
            <div className="pt-1 border-t border-gray-100">
              <dt className="text-xs text-gray-400 mb-0.5">Notes</dt>
              <dd className="text-sm text-gray-600 italic">"{financing.notes}"</dd>
            </div>
          )}

          {/* ERP sync status */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <dt className="text-gray-500">ERP Sync</dt>
            <dd>
              {financing.erpSyncedAt ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle size={13} />
                  <span className="text-xs font-medium">
                    Synced · {formatDateTime(financing.erpSyncedAt)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle size={13} />
                  <span className="text-xs font-medium">Not synced</span>
                </div>
              )}
            </dd>
          </div>

          {/* ERP sync button — ADMIN only */}
          {isAdmin && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onErpSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:text-primary border border-gray-300 hover:border-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync to ERP'}
              </button>
              {syncMessage && (
                <p className={`text-xs mt-2 text-center ${syncMessage.includes('success') || syncMessage.includes('successful') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {syncMessage}
                </p>
              )}
            </div>
          )}
        </dl>
      )}

      {/* Edit button (read view) */}
      {!editing && canEdit && (
        <div className="flex justify-end pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary px-3 py-1.5 rounded-lg border border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Edit2 size={14} />
            Edit Financing
          </button>
        </div>
      )}
    </div>
  );
};

export default FinancingPanel;
