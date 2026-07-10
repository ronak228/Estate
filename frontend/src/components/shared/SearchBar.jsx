import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * SearchBar — debounced text search input.
 * Fires onChange after 400ms of inactivity.
 */
const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
  const [localValue, setLocalValue] = useState(value || '');

  // Sync if parent resets value
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 400);
    return () => clearTimeout(timer);
  }, [localValue]);

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64"
      />
    </div>
  );
};

export default SearchBar;
