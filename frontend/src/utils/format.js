/**
 * Format a date string to a readable locale date.
 */
export const formatDate = (dateStr, timezone = 'Asia/Kolkata') => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

/**
 * Format a date string to a readable locale date + time.
 */
export const formatDateTime = (dateStr, timezone = 'Asia/Kolkata') => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number as currency. All monetary amounts in this app are stored
 * as whole rupees (no paise/decimals), so fraction digits are always suppressed.
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Capitalize first letter of a string.
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
