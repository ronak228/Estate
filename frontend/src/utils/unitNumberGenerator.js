/**
 * Pure generation logic for "Bulk Add Units": one unit number per floor per
 * suffix, e.g. floor 1 + suffixes [01,02,03,04] -> 101,102,103,104, floor 10
 * + same suffixes -> 1001,1002,1003,1004.
 */

// Mirrors MAX_BULK_UNITS in backend/src/utils/constants.js — checked client-side
// too so the admin gets instant feedback instead of a round-trip 400.
export const MAX_BULK_UNITS = 500;

// Default suffixes are zero-padded sequence 01..N (03-digit once count > 99).
export const buildDefaultSuffixes = (unitsPerFloor) => {
  const count = Math.max(0, Number(unitsPerFloor) || 0);
  const width = count > 99 ? 3 : 2;
  return Array.from({ length: count }, (_, i) => String(i + 1).padStart(width, '0'));
};

/**
 * @param {object} params
 * @param {number} params.startFloor
 * @param {number} params.endFloor
 * @param {string[]} params.suffixes - per-floor suffix list, e.g. ['01','02','03','04']
 * @returns {{ floor: number, unitNumber: string }[]}
 */
export const generateUnitNumbers = ({ startFloor, endFloor, suffixes }) => {
  const units = [];
  for (let floor = startFloor; floor <= endFloor; floor++) {
    for (const suffix of suffixes) {
      units.push({ floor, unitNumber: `${floor}${suffix}` });
    }
  }
  return units;
};
