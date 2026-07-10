/**
 * Card — consistent white panel used for dashboard widgets, detail-page
 * sections, and standalone forms (e.g. login). Replaces the repeated
 * `bg-white rounded-xl shadow-sm border border-gray-200 p-*` block.
 *
 * Static cards carry no shadow (a thin border is enough weight); pass
 * `hover` for cards that are themselves clickable/actionable, which then
 * pick up elevation only on interaction rather than at rest.
 */
const Card = ({
  title,
  actions,
  footer,
  padding = 'p-6',
  hover = false,
  className = '',
  children,
}) => {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200
        ${hover ? 'transition-shadow duration-200 ease-snappy hover:shadow-card-hover' : ''}
        ${className}
      `}
    >
      <div className={padding}>
        {(title || actions) && (
          <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            {title && (
              typeof title === 'string'
                ? <h2 className="text-sm font-semibold text-gray-800 tracking-tight">{title}</h2>
                : title
            )}
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
