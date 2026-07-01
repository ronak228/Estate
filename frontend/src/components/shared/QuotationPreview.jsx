import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';

/**
 * QuotationPreview — print-friendly layout for a quotation.
 * Used inside QuotationDetailPage for the on-screen preview before download.
 * Also defines the visual structure that mirrors the PDF output.
 *
 * Props:
 *   quotation — full quotation object (includes charges, unit.project, inquiry.contact)
 *   company   — { name, email, phone, address } (optional — falls back to generic header)
 */
const QuotationPreview = ({ quotation, company }) => {
  if (!quotation) return null;

  const { charges = [], unit, inquiry, createdBy, basePrice, totalAmount, decision, validUntil } =
    quotation;
  const contact = inquiry?.contact;
  const project = unit?.project;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0">
      {/* Header */}
      <div className="bg-primary px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-xl">{company?.name || 'Real Estate CRM'}</p>
            <p className="text-indigo-200 text-sm mt-0.5">PROPERTY QUOTATION</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-xs">Quotation #</p>
            <p className="text-white font-mono font-bold text-sm">
              {quotation.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Company info + dates */}
        <div className="flex items-start justify-between gap-4 text-sm">
          <div className="text-gray-500 space-y-0.5">
            {company?.address && <p>{company.address}</p>}
            {company?.phone && <p>Tel: {company.phone}</p>}
            {company?.email && <p>Email: {company.email}</p>}
          </div>
          <div className="text-right text-gray-600 space-y-1">
            <div>
              <span className="text-gray-400 text-xs">Date Issued</span>
              <p className="font-medium">{formatDate(quotation.createdAt)}</p>
            </div>
            {validUntil && (
              <div>
                <span className="text-gray-400 text-xs">Valid Until</span>
                <p className="font-medium text-amber-600">{formatDate(validUntil)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Customer + Property */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Prepared For
            </p>
            <p className="font-semibold text-gray-900 text-base">{contact?.fullName || '—'}</p>
            {contact?.phone && <p className="text-gray-500 mt-0.5">{contact.phone}</p>}
            {contact?.email && <p className="text-gray-500">{contact.email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Property Details
            </p>
            <p className="font-semibold text-gray-900 text-base">Unit {unit?.unitNumber || '—'}</p>
            <p className="text-gray-500 mt-0.5">{project?.name || '—'}</p>
            {project?.location && <p className="text-gray-500">{project.location}</p>}
            <p className="text-gray-400 text-xs mt-1">Prepared by: {createdBy?.fullName || '—'}</p>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Pricing table */}
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            Pricing Breakdown
          </p>

          <div className="rounded-lg overflow-hidden border border-gray-200">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>

            {/* Base price */}
            <div className="grid grid-cols-[1fr_auto] px-4 py-3 border-t border-gray-100 bg-indigo-50/40">
              <span className="text-sm font-semibold text-gray-800">Base Unit Price</span>
              <span className="text-sm font-semibold text-gray-800 text-right">
                {formatCurrency(basePrice)}
              </span>
            </div>

            {/* Additional charges */}
            {charges.map((charge, i) => (
              <div
                key={charge.id || i}
                className={`grid grid-cols-[1fr_auto] px-4 py-3 border-t border-gray-100 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <span className="text-sm text-gray-700">{charge.label}</span>
                <span className="text-sm text-gray-700 text-right">
                  {formatCurrency(charge.amount)}
                </span>
              </div>
            ))}

            {/* Total */}
            <div className="grid grid-cols-[1fr_auto] px-4 py-3 bg-primary border-t border-primary">
              <span className="text-sm font-bold text-white">Total Amount</span>
              <span className="text-sm font-bold text-white text-right">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Decision badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Decision:</span>
            <StatusBadge value={decision} />
          </div>
          {validUntil && (
            <p className="text-xs text-gray-400">
              Valid until {formatDate(validUntil)}
            </p>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          This quotation is a snapshot generated at creation time. Base price reflects the unit
          price on the date this quotation was issued and will not change if the unit price is
          later updated.
        </p>
      </div>
    </div>
  );
};

export default QuotationPreview;
