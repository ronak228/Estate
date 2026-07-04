import { FileText, CreditCard, Home, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/format';

/**
 * TransactionStatusBar — compact progress strip showing the four workstream states.
 * Displayed at the top of TransactionDetailPage.
 *
 * Props:
 *   invoices     — Invoice[] (to derive issued count)
 *   payments     — TransactionPayment[] (to derive reconciled count)
 *   titleTransfer — TitleTransfer | null
 *   transaction  — Transaction | null (for erpSyncedAt)
 */
const TransactionStatusBar = ({
  invoices = [],
  payments = [],
  titleTransfer = null,
  transaction = null,
}) => {
  const issuedCount = invoices.filter((inv) =>
    ['ISSUED', 'PARTIALLY_PAID', 'PAID'].includes(inv.status)
  ).length;
  const reconciledCount = payments.filter((p) => p.status === 'RECONCILED').length;
  const titleDone = titleTransfer?.status === 'COMPLETED';
  const erpSynced = !!transaction?.erpSyncedAt;

  const workstreams = [
    {
      key: 'invoices',
      icon: FileText,
      label: 'Invoices',
      done: issuedCount > 0,
      detail: invoices.length === 0
        ? 'None generated'
        : `${issuedCount} / ${invoices.length} issued`,
    },
    {
      key: 'payments',
      icon: CreditCard,
      label: 'Payments',
      done: reconciledCount > 0,
      detail: payments.length === 0
        ? 'None recorded'
        : `${reconciledCount} / ${payments.length} reconciled`,
    },
    {
      key: 'title',
      icon: Home,
      label: 'Title Transfer',
      done: titleDone,
      detail: titleTransfer
        ? titleTransfer.status.replace('_', ' ')
        : 'Not initiated',
    },
    {
      key: 'erp',
      icon: RefreshCw,
      label: 'ERP Sync',
      done: erpSynced,
      detail: erpSynced
        ? `Synced ${formatDateTime(transaction.erpSyncedAt)}`
        : 'Not synced',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {workstreams.map((ws, idx) => {
          const Icon = ws.icon;
          const StatusIcon = ws.done ? CheckCircle : idx === 0 && invoices.length === 0 ? Clock : AlertCircle;
          return (
            <div key={ws.key} className="flex items-start gap-2.5">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  ws.done ? 'bg-emerald-100' : 'bg-gray-100'
                }`}
              >
                <Icon size={16} className={ws.done ? 'text-emerald-600' : 'text-gray-400'} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs font-semibold text-gray-700 truncate">{ws.label}</span>
                  <StatusIcon
                    size={11}
                    className={ws.done ? 'text-emerald-500 flex-shrink-0' : 'text-gray-400 flex-shrink-0'}
                  />
                </div>
                <p className="text-xs text-gray-500 truncate">{ws.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionStatusBar;
