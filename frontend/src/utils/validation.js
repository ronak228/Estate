/**
 * Small, focused client-side field validators shared across forms (P2-23).
 * Previously each form re-implemented the same numeric/required checks ad hoc
 * — or skipped them entirely — so drift was easy (e.g. a form silently having
 * no validation at all). These mirror the checks the backend actually enforces
 * so users get instant feedback instead of a round-trip 400.
 */

export const isRequired = (value) =>
  value !== undefined && value !== null && String(value).trim() !== '';

export const isPositiveNumber = (value) =>
  value !== '' && value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0;

export const isNonNegativeNumber = (value) =>
  value === '' || value === undefined || value === null || (!isNaN(Number(value)) && Number(value) >= 0);

/**
 * All monetary fields (prices, amounts, payments) are whole rupees only —
 * no paise/decimals. Reused across every money-related form.
 */
export const isPositiveInteger = (value) =>
  value !== '' && value !== undefined && value !== null && Number.isInteger(Number(value)) && Number(value) > 0;

export const isNonNegativeInteger = (value) =>
  value === '' || value === undefined || value === null || (Number.isInteger(Number(value)) && Number(value) >= 0);

export const isPastDate = (value) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
};
