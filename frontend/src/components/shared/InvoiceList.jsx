import { useState } from 'react';
import { Plus, Download, ChevronDown } from 'lucide-react';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import InvoiceForm from './InvoiceForm';
import EmptyState from './EmptyState';
import { formatCurrency, formatDate } from '../../utils/format';

const INVOICE_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
];

/**
 * InvoiceList — list of invoices for a booking, with generate, download PDF, and status update.
 *
 * Props:
 *   invoices         — Invoice[] (each includes .payments for reconciled payments)
 *   onGenerate       — async ({ amount, dueDate?, notes? }) => void
 *   onDownloadPdf    — async (invoiceId, invoiceNumber) => void
 *   onUpdateStatus   — async (invoiceId, status) => void
 *   generating       — boolean
 *   generateError    — string
 *   canManage        — boolean (ADMIN/MANAGER)
 */
const InvoiceList = ({
  invoices = [],
  onGenerate,
  onDownloadPdf,
  onUpdateStatus,
  generating = false,
  generateError = '',
  canManage = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusDropdown, setStatusDropdown] = useState(null); // invoiceId with open dropdown

  const handleGenerate = async (data) => {
    await onGenerate(data);
    setModalOpen(false);
  };

  const handleDownload = async (invoice) => {
    setDownloadingId(invoice.id);
    try {
      await onDownloadPdf(invoice.id, invoice.invoiceNumber);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusUpdate = async (invoiceId, status) => {
    setUpdatingId(invoiceId);
    setStatusDropdown(null);
    try {
      await onUpdateStatus(invoiceId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Generate invoice button — ADMIN/MANAGER only */}
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Generate Invoice
          </button>
        </div>
      )}

      {/* Invoice table */}
      {invoices.length === 0 ? (
        <EmptyState message="No invoices generated yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const reconciledTotal = (inv.payments || []).reduce(
                  (sum, p) => sum + Number(p.amount),
                  0
                );
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-800 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge value={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {reconciledTotal > 0 ? (
                        <span className="text-emerald-700 font-medium">
                          {formatCurrency(reconciledTotal)}
                        </span>
                      ) : (
                        <span className="text-gray-400">None reconciled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownload(inv)}
                          disabled={downloadingId === inv.id}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download size={13} />
                          {downloadingId === inv.id ? 'Downloading...' : 'PDF'}
                        </button>

                        {/* Status update dropdown — ADMIN/MANAGER only */}
                        {canManage && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setStatusDropdown(statusDropdown === inv.id ? null : inv.id)
                              }
                              disabled={updatingId === inv.id}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                            >
                              {updatingId === inv.id ? 'Updating...' : 'Set Status'}
                              <ChevronDown size={11} />
                            </button>
                            {statusDropdown === inv.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                {INVOICE_STATUS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleStatusUpdate(inv.id, opt.value)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                                      inv.status === opt.value
                                        ? 'font-semibold text-primary'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Invoice"
        size="md"
      >
        <InvoiceForm
          onSubmit={handleGenerate}
          onCancel={() => setModalOpen(false)}
          submitting={generating}
          apiError={generateError}
        />
      </Modal>

      {/* Close dropdown on outside click */}
      {statusDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setStatusDropdown(null)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default InvoiceList;
