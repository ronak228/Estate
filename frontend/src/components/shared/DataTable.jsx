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
    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
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
                transition-colors
                ${onRowClick ? 'cursor-pointer hover:bg-primary-50' : 'hover:bg-gray-50'}
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
