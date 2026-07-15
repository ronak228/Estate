import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate, getCurrencySymbol } from '../../utils/format';

/**
 * QuotationPreview — print-friendly layout for a quotation, styled as a
 * formal printed ledger document (centered letterhead, ruled pricing table,
 * dual signature lines). Used inside QuotationDetailPage for the on-screen
 * preview before download, and defines the visual structure that mirrors
 * the PDF output.
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
  const companyName = company?.name || 'Real Estate CRM';

  return (
    <div className="bg-white rounded-xl border-2 border-gray-800 overflow-hidden shadow-card print:shadow-none">
      <div className="p-7 sm:p-9">
        {/* Centered letterhead */}
        <div className="text-center pb-5 border-b-4 border-double border-gray-800 mb-5">
          <p className="text-xl font-extrabold tracking-tight text-gray-900">{companyName.toUpperCase()}</p>
          {(company?.address || company?.phone) && (
            <p className="text-xs text-gray-500 mt-1.5">
              {[company?.address, company?.phone].filter(Boolean).join(' · ')}
            </p>
          )}
          <span className="inline-block mt-3.5 text-[11px] font-extrabold tracking-[0.18em] uppercase border border-gray-800 rounded-full px-4 py-1.5 text-gray-800">
            Property Quotation
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-start justify-between text-xs text-gray-600 mb-5">
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-gray-400">Quotation No.</p>
            <p className="font-bold font-mono text-gray-800 mt-0.5">{quotation.id?.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10.5px] uppercase tracking-wide text-gray-400">Date Issued</p>
            <p className="font-bold text-gray-800 mt-0.5">{formatDate(quotation.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] uppercase tracking-wide text-gray-400">Valid Until</p>
            <p className="font-bold text-warning-600 mt-0.5">{validUntil ? formatDate(validUntil) : '—'}</p>
          </div>
        </div>

        {/* Prepared For / Property */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-4 border-y border-gray-200 mb-6 text-sm">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Prepared For</p>
            <p className="font-bold text-gray-900">{contact?.fullName || '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[contact?.phone, contact?.email].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">Property</p>
            <p className="font-bold text-gray-900">
              Unit {unit?.unitNumber || '—'}{project?.name ? `, ${project.name}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[project?.location, `Prepared by ${createdBy?.fullName || '—'}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Ruled pricing table */}
        <table className="w-full text-sm mb-1">
          <thead>
            <tr>
              <th className="text-left text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 border-b-2 border-gray-800 pb-2">
                Description
              </th>
              <th className="text-right text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500 border-b-2 border-gray-800 pb-2">
                Amount ({getCurrencySymbol()})
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2.5 border-b border-gray-200 font-bold text-gray-900">Base Unit Price</td>
              <td className="py-2.5 border-b border-gray-200 text-right tabular-nums font-bold text-gray-900">
                {formatCurrency(basePrice)}
              </td>
            </tr>
            {charges.map((charge, i) => (
              <tr key={charge.id || i}>
                <td className="py-2.5 border-b border-gray-200 text-gray-700">{charge.label}</td>
                <td className="py-2.5 border-b border-gray-200 text-right tabular-nums text-gray-700">
                  {formatCurrency(charge.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 border-t-2 border-gray-800 font-extrabold text-[15px] text-gray-900">
                Total Amount
              </td>
              <td className="pt-3 border-t-2 border-gray-800 font-extrabold text-[15px] text-right tabular-nums text-gray-900">
                {formatCurrency(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Decision */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Decision:</span>
          <StatusBadge value={decision} />
        </div>

        {/* Signatures — both columns reserve the same h-9 image slot above the
            rule, so the two signature lines land on the same row whether or
            not a signature image is present. */}
        <div className="flex justify-between mt-11 gap-8">
          <div className="text-center w-[42%]">
            <div className="h-9" aria-hidden="true" />
            <div className="border-t border-gray-400 pt-1.5 text-[10.5px] text-gray-500">Customer Signature</div>
          </div>
          <div className="text-center w-[42%]">
            <div className="h-9 flex items-end justify-center">
              {company?.signatureUrl && (
                <img
                  src={company.signatureUrl}
                  alt="Authorized signature"
                  className="max-h-9 max-w-full object-contain"
                />
              )}
            </div>
            <div className="border-t border-gray-400 pt-1.5 text-[10.5px] text-gray-500">
              Authorized Signatory, {companyName}
            </div>
          </div>
        </div>

        <p className="text-[10.5px] text-gray-400 text-center mt-6 leading-relaxed">
          This quotation is a snapshot generated at creation time and reflects unit pricing as of
          the issue date above.
        </p>
      </div>
    </div>
  );
};

export default QuotationPreview;
