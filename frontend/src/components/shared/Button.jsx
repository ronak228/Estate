import { Loader2 } from 'lucide-react';

/**
 * Button — consistent button component used everywhere.
 * Variants: primary, secondary, danger, ghost, outline
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  onClick,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-snappy focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  // Primary/secondary/danger carry a fine top-edge highlight (real depth,
  // not a flat fill) and only pick up shadow elevation on hover — ghost and
  // outline stay flat at every state so they read unmistakably secondary.
  const variants = {
    primary:
      'bg-primary text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)] hover:bg-primary-600 hover:shadow-card-hover focus:ring-primary',
    secondary:
      'bg-secondary text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)] hover:bg-sky-600 hover:shadow-card-hover focus:ring-secondary',
    danger:
      'bg-danger-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)] hover:bg-red-700 hover:shadow-card-hover focus:ring-red-500',
    ghost:
      'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
    outline:
      'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:ring-primary',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 16} />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : 16} />}
    </button>
  );
};

export default Button;
