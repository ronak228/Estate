import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Select — custom listbox dropdown (no native <select> popup, so it can be
 * fully styled to match the design system instead of inheriting OS chrome).
 * Same external API as a native select: `onChange` fires a synthetic
 * `{ target: { name, value } }` event so every existing call site
 * (`onChange={handleChange}` reading `e.target.name`/`e.target.value`)
 * keeps working unchanged.
 */
const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selected = options.find((opt) => String(opt.value) === String(value));

  const selectOption = (optValue) => {
    setOpen(false);
    onChange?.({ target: { name, value: optValue } });
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={rootRef}>
      <div className="relative">
        <button
          type="button"
          id={name}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`
            peer w-full flex items-center justify-between gap-2 px-3 pt-5 pb-1.5 text-sm text-left rounded-lg border bg-white transition-colors duration-150 ease-snappy
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <span className={selected ? 'text-gray-900 truncate' : 'text-transparent select-none'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ease-snappy ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {label && (
          <label
            htmlFor={name}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 transition-all duration-150 ease-snappy pointer-events-none
              peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-[9px] peer-focus:leading-none peer-focus:font-semibold peer-focus:text-primary peer-focus:tracking-wide peer-focus:uppercase"
            style={selected ? { top: '0.375rem', transform: 'none', fontSize: '9px', lineHeight: 1, fontWeight: 600, color: '#6B7280', letterSpacing: '0.025em', textTransform: 'uppercase' } : undefined}
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-dropdown z-20 py-1.5 origin-top animate-scale-in"
            >
              {options.length === 0 && (
                <li className="px-3.5 py-2 text-sm text-gray-400">No options</li>
              )}
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => selectOption(opt.value)}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-left transition-colors duration-150 ease-snappy
                        ${isSelected ? 'bg-primary-50 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={14} className="flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
