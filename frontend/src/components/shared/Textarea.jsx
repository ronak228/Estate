/**
 * Textarea — floating-label multi-line field, matching Input/Select styling.
 */
const Textarea = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  rows = 3,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="relative">
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ' '}
          disabled={disabled}
          rows={rows}
          className={`
            peer w-full px-3 pt-5 pb-1.5 text-sm rounded-lg border bg-white transition-colors duration-150 ease-snappy resize-none
            placeholder-transparent
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          {...props}
        />
        {label && (
          <label
            htmlFor={name}
            className="absolute left-3 top-1.5 text-[9px] leading-none font-semibold uppercase tracking-wide text-gray-500 transition-colors duration-150 ease-snappy pointer-events-none
              peer-focus:text-primary"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Textarea;
