// pdfkit's standard 14 fonts (Helvetica) use WinAnsiEncoding, which has no
// glyph for ₹ (U+20B9) or several other currency symbols — Intl's "currency"
// style silently maps unsupported glyphs to the wrong single-byte character.
// Format the digit grouping ourselves and prefix an ASCII-safe label instead
// of embedding a custom font.
const CURRENCY_PREFIX = { INR: 'Rs.', USD: '$', GBP: '£', AED: 'AED' };
const CURRENCY_LOCALE = { INR: 'en-IN', USD: 'en-US', GBP: 'en-GB', AED: 'en-AE' };

const formatPdfCurrency = (amount, currency = 'INR') => {
  const prefix = CURRENCY_PREFIX[currency] || currency;
  const locale = CURRENCY_LOCALE[currency] || 'en-US';
  return `${prefix} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)}`;
};

module.exports = formatPdfCurrency;
