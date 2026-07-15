import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

/**
 * RecordList / RecordRow — bordered card of clickable "linked record" rows
 * (e.g. contact/inquiry/quotation links on a detail page's rail). Rows with
 * a `to` render as a Link with a hover state and trailing external-link
 * icon; rows without one render as plain read-only info.
 */
export const RecordList = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200">
    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
          <Icon size={17} />
        </div>
      )}
      <h2 className="text-sm font-semibold text-gray-800 tracking-tight">{title}</h2>
    </div>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);

export const RecordRow = ({ to, icon: Icon, primary, secondary }) => {
  const inner = (
    <>
      {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${to ? 'text-primary' : 'text-gray-900'}`}>{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate mt-0.5">{secondary}</p>}
      </div>
      {to && <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />}
    </>
  );

  const rowClass = `flex items-center gap-2.5 px-5 py-3 text-sm transition-colors duration-150 ease-snappy ${
    to ? 'hover:bg-gray-50' : ''
  }`;

  return to ? (
    <Link to={to} className={rowClass}>{inner}</Link>
  ) : (
    <div className={rowClass}>{inner}</div>
  );
};

export const RecordEmpty = ({ message = 'No linked records' }) => (
  <p className="px-5 py-3 text-sm text-gray-400">{message}</p>
);
