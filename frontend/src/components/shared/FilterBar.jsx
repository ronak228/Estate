/**
 * FilterBar — horizontal row of filter controls above a DataTable.
 * Supports 'select' and 'date' filter types.
 */
const FilterBar = ({ filters = [], values = {}, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <select
              key={filter.key}
              value={values[filter.key] || ''}
              onChange={(e) => handleChange(filter.key, e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">{filter.label}</option>
              {(filter.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        if (filter.type === 'date') {
          return (
            <div key={filter.key} className="flex items-center gap-1">
              <label className="text-xs text-gray-500">{filter.label}</label>
              <input
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => handleChange(filter.key, e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          );
        }

        return null;
      })}

      {Object.values(values).some(Boolean) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors duration-150 ease-snappy"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default FilterBar;
