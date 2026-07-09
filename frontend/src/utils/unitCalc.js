/**
 * Client-side preview math for a unit's area/basePrice. Mirrors calcPricing()
 * in backend/src/controllers/unitController.js — display-only, the server
 * always recalculates and is the source of truth on save.
 */
export const calcAreaAndBasePrice = (width, length, pricePerSqFt) => {
  const area = (Number(width) || 0) * (Number(length) || 0);
  const basePrice = Math.round(area * (Number(pricePerSqFt) || 0));
  return { area, basePrice };
};
