import { TrendingDown, User, Clock } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatDateTime, formatCurrency } from '../../utils/format';

/**
 * NegotiationHistory — timeline of negotiation offers for an inquiry.
 * Follows the same visual pattern as ActivityTimeline.jsx.
 */
const NegotiationHistory = ({ negotiations = [] }) => {
  if (negotiations.length === 0) {
    return <EmptyState message="No negotiation history yet" />;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-4 space-y-4">
      {negotiations.map((neg, idx) => (
        <li key={neg.id} className="ml-4">
          {/* Dot */}
          <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white">
            <TrendingDown size={10} />
          </span>

          <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Offer #{negotiations.length - idx}
                  </span>
                  {neg.quotation && (
                    <span className="text-xs text-gray-400">
                      vs. Quoted {formatCurrency(neg.quotation.totalAmount)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  Offered: {formatCurrency(neg.offeredPrice)}
                </p>
                {Number(neg.discountAmount) > 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Discount: {formatCurrency(neg.discountAmount)}
                  </p>
                )}
                {neg.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{neg.notes}"</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <User size={11} className="text-gray-400" />
              <span className="text-xs text-gray-400">
                {neg.createdBy?.fullName || 'Unknown'}
              </span>
              <span className="text-gray-200">•</span>
              <Clock size={11} className="text-gray-400" />
              <span className="text-xs text-gray-400">{formatDateTime(neg.createdAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default NegotiationHistory;
