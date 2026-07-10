import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

/**
 * DataTable — single table implementation for every list view.
 * Column render functions are how StatusBadge/dates/links get embedded.
 */
const DataTable = ({ columns = [], rows = [], onRowClick, loading = false, emptyState }) => {
  if (loading) {
    return <LoadingState label="Loading..." />;
  }

  if (!rows.length) {
    return (
      emptyState || (
        <EmptyState message="No records found" />
      )
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`
                transition-colors duration-150 ease-snappy hover:bg-gray-50
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
