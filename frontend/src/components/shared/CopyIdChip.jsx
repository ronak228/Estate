import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Button from './Button';

/**
 * CopyIdChip — dashed-border ID display with a copy-to-clipboard button.
 * Used on detail pages (Quotation ID, Booking ID, etc.) so the copy
 * interaction stays identical everywhere it appears.
 */
const CopyIdChip = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10.5px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon={copied ? Check : Copy}
        onClick={handleCopy}
        title={`Copy ${label.toLowerCase()}`}
        aria-label={`Copy ${label.toLowerCase()}`}
        className={copied ? 'text-success' : ''}
      />
    </div>
  );
};

export default CopyIdChip;
