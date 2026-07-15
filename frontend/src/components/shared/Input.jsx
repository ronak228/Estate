/**
 * Input — floating-label text/email/password/number field. The label sits
 * inside the field until focused or filled, then floats into the border
 * (see design review round 2, "Form E"). Border/ring double as the focus
 * indicator, so no separate `:focus` outline is needed.
 */
const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ' '}
          disabled={disabled}
          className={`
            peer w-full px-3 pt-5 pb-1.5 text-sm rounded-lg border bg-white transition-colors duration-150 ease-snappy
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 transition-all duration-150 ease-snappy pointer-events-none
              peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-[9px] peer-focus:leading-none peer-focus:font-semibold peer-focus:text-primary peer-focus:tracking-wide peer-focus:uppercase
              peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9px] peer-[:not(:placeholder-shown)]:leading-none peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-gray-500 peer-[:not(:placeholder-shown)]:tracking-wide peer-[:not(:placeholder-shown)]:uppercase"
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

export default Input;
