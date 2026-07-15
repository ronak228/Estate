import { Download } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import Button from './Button';
import { formatCurrency, formatDate } from '../../utils/format';

/**
 * PaymentList — table of a booking's full payment history: the token/booking
 * amount (flagged via `isToken`) plus every BookingPayment recorded after.
 *
 * Props:
 *   payments   — merged token + BookingPayment rows (see utils/booking.js)
 *   onDownload — optional (payment) => void, shows a per-row receipt download button
 */
const PaymentList = ({ payments = [], onDownload }) => {
  if (payments.length === 0) {
    return <EmptyState message="No payments recorded yet" />;
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
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
                Recorded By
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              {onDownload && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDate(payment.paidAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {payment.isToken ? (
                    <span className="inline-flex items-center font-medium rounded-full text-xs px-2.5 py-1 bg-primary/10 text-primary">
                      Token / Booking Amount
                    </span>
                  ) : (
                    <StatusBadge value={payment.mode} />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {payment.referenceNumber || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {payment.createdBy?.fullName || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                  {formatCurrency(payment.amount)}
                </td>
                {onDownload && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={Download}
                      onClick={() => onDownload(payment)}
                      title="Download receipt"
                      aria-label={`Download receipt for payment of ${formatCurrency(payment.amount)}`}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                Total Paid
              </td>
              <td className="px-4 py-3 text-sm font-bold text-primary text-right">
                {formatCurrency(totalPaid)}
              </td>
              {onDownload && <td className="px-4 py-3" />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PaymentList;
