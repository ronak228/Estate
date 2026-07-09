/**
 * All monetary fields (prices, amounts, payments) are stored as whole-rupee
 * integers — no paise/decimals. These are reused across unit/quotation/
 * negotiation/booking controllers so the integer-only rule is enforced
 * identically everywhere instead of each controller re-implementing it.
 */

const isPositiveInteger = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
};

const isNonNegativeInteger = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
};

module.exports = { isPositiveInteger, isNonNegativeInteger };
