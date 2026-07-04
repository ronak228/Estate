import { useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import PaymentForm from './PaymentForm';
import ReconciliationPanel from './ReconciliationPanel';
import EmptyState from './EmptyState';
import { formatCurrency, formatDate } from '../../utils/format';

/**
 * TransactionPaymentList — list of recorded installment/milestone payments for a booking.
 * Built on the same visual pattern as PaymentList.jsx (Module 4).
 *
 * Props:
 *   payments        — TransactionPayment[] (each includes invoice if reconciled)
 *   invoices        — Invoice[] (for reconciliation dropdown)
 *   onAddPayment    — async ({ amount, mode, paidAt, referenceNumber? }) => void
 *   onReconcile     — async (paymentId, invoiceId) => void
 *   adding          — boolean
 *   addError        — string
 *   canManage       — boolean (ADMIN/MANAGER)
 */
const TransactionPaymentList = ({
  payments = [],
  invoices = [],
  onAddPayment,
  onReconcile,
  adding = false,
  addError = '',
  canManage = false,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState(null); // payment to reconcile

  const handleAddPayment = async (data) => {
    await onAddPayment(data);
    setAddOpen(false);
  };

  const handleReconcile = async (paymentId, invoiceId) => {
    await onReconcile(paymentId, invoiceId);
    setReconcileTarget(null);
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Add payment button — ADMIN/MANAGER only */}
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Record Payment
          </button>
        </div>
      )}

      {/* Payments table */}
      {payments.length === 0 ? (
        <EmptyState message="No transaction payments recorded yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(payment.paidAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge value={payment.mode} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {payment.referenceNumber || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge value={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {payment.invoice ? (
                      <span className="font-mono text-xs text-gray-700">
                        {payment.invoice.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                    {formatCurrency(payment.amount)}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {payment.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => setReconcileTarget(payment)}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark"
                        >
                          <Link2 size={12} />
                          Reconcile
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Reconciled</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  Total Recorded
                </td>
                <td className="px-4 py-3 text-sm font-bold text-primary text-right">
                  {formatCurrency(totalPaid)}
                </td>
                {canManage && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Record Transaction Payment"
        size="md"
      >
        <PaymentForm
          onSubmit={handleAddPayment}
          onCancel={() => setAddOpen(false)}
          submitting={adding}
          apiError={addError}
        />
      </Modal>

      {/* Reconciliation Modal */}
      <Modal
        isOpen={!!reconcileTarget}
        onClose={() => setReconcileTarget(null)}
        title="Reconcile Payment to Invoice"
        size="md"
      >
        {reconcileTarget && (
          <ReconciliationPanel
            payment={reconcileTarget}
            invoices={invoices}
            onReconcile={handleReconcile}
            onCancel={() => setReconcileTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default TransactionPaymentList;
