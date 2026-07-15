import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, PhoneCall, BookOpen, Layers, Home, SearchX, Loader2 } from 'lucide-react';
import searchService from '../../services/searchService';
import StatusBadge from '../shared/StatusBadge';

const GROUPS = [
  { key: 'contacts', label: 'Contacts', icon: User },
  { key: 'inquiries', label: 'Inquiries', icon: PhoneCall },
  { key: 'bookings', label: 'Bookings', icon: BookOpen },
  { key: 'projects', label: 'Projects', icon: Layers },
  { key: 'units', label: 'Units', icon: Home },
];

const resultMeta = (group, item) => {
  switch (group) {
    case 'contacts':
      return { to: `/contacts/${item.id}`, primary: item.fullName, secondary: item.phone };
    case 'inquiries':
      return { to: `/inquiries/${item.id}`, primary: item.contactName, secondary: item.stage, badge: item.stage };
    case 'bookings':
      return { to: `/bookings/${item.id}`, primary: item.contactName, secondary: `Unit ${item.unitNumber}`, badge: item.status };
    case 'projects':
      return { to: `/projects/${item.id}`, primary: item.name, secondary: item.location };
    case 'units':
      return { to: `/projects/${item.projectId}`, primary: `Unit ${item.unitNumber}`, secondary: item.projectName, badge: item.status };
    default:
      return { to: '/', primary: '', secondary: '' };
  }
};

/**
 * GlobalSearch — debounced, typo-tolerant search across contacts, inquiries,
 * bookings, projects, and units (GET /api/search, pg_trgm-backed on the
 * backend). Shows grouped results in a dropdown, or an explicit "no results"
 * state when the query is confidently empty-handed.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const debounceRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const runSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchService.globalSearch(q.trim());
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const clear = () => {
    setQuery('');
    setResults(null);
  };

  const goTo = (to) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(to);
  };

  const groupsWithResults = results ? GROUPS.filter((g) => (results[g.key] || []).length > 0) : [];
  const hasAnyResults = groupsWithResults.length > 0;
  const showNoResults = results && !loading && !hasAnyResults;

  return (
    <div className="relative flex-1 max-w-md" ref={rootRef}>
      <div className="relative">
        {loading ? (
          <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none" />
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts, inquiries, bookings, units…"
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-transparent bg-gray-100 transition-colors duration-150 ease-snappy placeholder:text-gray-400 hover:bg-gray-200/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          aria-label="Global search"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150 ease-snappy"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-dropdown z-30 origin-top animate-scale-in">
          {showNoResults && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <SearchX size={22} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No results for "{results.query}"</p>
              <p className="text-xs text-gray-400">Check the spelling, or try a shorter search term.</p>
            </div>
          )}

          {hasAnyResults && (
            <div className="py-1.5">
              {groupsWithResults.map((group) => (
                <div key={group.key}>
                  <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </p>
                  {results[group.key].map((item) => {
                    const { to, primary, secondary, badge } = resultMeta(group.key, item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(to)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 transition-colors duration-150 ease-snappy"
                      >
                        <group.icon size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-gray-900 truncate">{primary || '—'}</span>
                          {secondary && <span className="block text-xs text-gray-400 truncate">{secondary}</span>}
                        </span>
                        {badge && <StatusBadge value={badge} size="xs" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
