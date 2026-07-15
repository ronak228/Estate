import { Loader2 } from 'lucide-react';

/**
 * Button — consistent button component used everywhere.
 * Variants: primary, secondary, danger, ghost, outline, link,
 *           dangerOutline, successOutline, dangerGhost
 * Pass `iconOnly` for a square icon-only button — always pair with
 * `aria-label` (and usually `title`) since there's no visible text.
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  iconOnly = false,
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
    // Text-link trigger — no box, no elevation, underlines on hover. For
    // inline actions like "Convert to Booking" that shouldn't read as a button.
    link:
      'bg-transparent text-primary hover:text-primary-600 hover:underline focus:ring-primary',
    // Outline shape, danger/success tint — for a toggle-style action whose
    // *current* choice is destructive/positive (Suspend, Deactivate, Cancel
    // Booking vs. Reactivate, Mark Complete) without the visual weight of a
    // fully filled `danger` button.
    dangerOutline:
      'border border-danger/30 text-danger bg-white hover:bg-danger-50 hover:border-danger/50 focus:ring-danger',
    successOutline:
      'border border-success/30 text-success bg-white hover:bg-success-50 hover:border-success/50 focus:ring-success',
    // Ghost shape that tints red on hover — for icon-only destructive row
    // actions (delete document, remove line item) that shouldn't shout at rest.
    dangerGhost:
      'bg-transparent text-gray-400 hover:bg-danger-50 hover:text-danger focus:ring-danger',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2',
  };

  // Link variant has no box, so it skips the padding that gives other
  // variants their button-sized hit area — text size and icon gap only.
  const linkSizes = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-1.5',
  };

  // Icon-only buttons are square, not rectangular — padding scales with
  // size but there's no text/gap to account for.
  const iconOnlySizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const sizeClass = iconOnly ? iconOnlySizes[size] : variant === 'link' ? linkSizes[size] : sizes[size];
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        Icon && (iconOnly || iconPosition === 'left') && <Icon size={iconSize} />
      )}
      {!iconOnly && children}
      {!loading && !iconOnly && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
    </button>
  );
};

export default Button;
