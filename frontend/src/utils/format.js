// ─── Company-driven formatting defaults ────────────────────────────────────
// Currency/timezone come from Company Settings and apply everywhere in the
// app that doesn't pass an explicit override — AuthContext calls the setters
// below whenever the logged-in user's company data loads or changes (login,
// session rehydration, or a Company Settings save).
const CURRENCY_LOCALES = { INR: 'en-IN', AED: 'en-AE', USD: 'en-US', GBP: 'en-GB' };
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', GBP: '£', AED: 'AED' };

let currentCurrency = 'INR';
let currentTimezone = 'Asia/Kolkata';

export const setCurrentCurrency = (currency) => {
  if (currency) currentCurrency = currency;
};

/**
 * Bare currency symbol/label for use in static UI text (form labels, chart
 * ticks, table headers) where a full formatCurrency() call would be wrong —
 * e.g. "Budget Min (₹)" needs just the symbol, not a formatted amount.
 */
export const getCurrencySymbol = () => CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;

export const setCurrentTimezone = (timezone) => {
  if (timezone) currentTimezone = timezone;
};

/**
 * Format a date string to a readable locale date.
 */
export const formatDate = (dateStr, timezone = currentTimezone) => {
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
export const formatDateTime = (dateStr, timezone = currentTimezone) => {
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
export const formatCurrency = (amount, currency = currentCurrency) => {
  if (amount == null) return '—';
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
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
