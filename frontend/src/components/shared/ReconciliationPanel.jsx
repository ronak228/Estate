import { useState } from 'react';
import { Link2 } from 'lucide-react';
import Select from './Select';
import { formatCurrency, formatDate } from '../../utils/format';

/**
 * ReconciliationPanel — shown inside a Modal when clicking "Reconcile" on a payment.
 * Presents a dropdown of the booking's un-reconciled invoices to match the payment to.
 *
 * Props:
 *   payment     — TransactionPayment record being reconciled
 *   invoices    — Invoice[] (all invoices for the booking)
 *   onReconcile — async (paymentId, invoiceId) => void
 *   onCancel    — () => void
 */
const ReconciliationPanel = ({ payment, invoices = [], onReconcile, onCancel }) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Only show invoices that are not fully PAID (DRAFT, ISSUED, PARTIALLY_PAID, OVERDUE)
  const eligibleInvoices = invoices.filter((inv) => inv.status !== 'PAID');

  const invoiceOptions = eligibleInvoices.map((inv) => ({
    value: inv.id,
    label: `${inv.invoiceNumber} — ${formatCurrency(inv.amount)} (${inv.status})`,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) { setError('Please select an invoice'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onReconcile(payment.id, selectedInvoiceId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reconcile payment');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Payment summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
        <p className="text-xs text-gray-500 mb-1">Payment being reconciled</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{formatDate(payment.paidAt)} · {payment.mode}</span>
          <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
        </div>
        {payment.referenceNumber && (
          <p className="text-xs text-gray-400 mt-1">Ref: {payment.referenceNumber}</p>
        )}
      </div>

      {eligibleInvoices.length === 0 ? (
        <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No eligible invoices found. Generate an invoice first, or all invoices are already fully paid.
        </div>
      ) : (
        <Select
          label="Match to Invoice"
          name="invoiceId"
          value={selectedInvoiceId}
          onChange={(e) => { setSelectedInvoiceId(e.target.value); setError(''); }}
          options={invoiceOptions}
          placeholder="Select invoice..."
          required
          error={error}
        />
      )}

      <div className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        <strong>Note:</strong> Reconciling links this payment to the selected invoice. The invoice
        status will not change automatically — update it separately once satisfied.
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || eligibleInvoices.length === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Link2 size={14} />
          {submitting ? 'Reconciling...' : 'Reconcile Payment'}
        </button>
      </div>
    </form>
  );
};

export default ReconciliationPanel;
