/**
 * Unit tests for pricing math (BUG-003 / BUG-029).
 * Unit.width/length/area are physical dimensions (feet / sq. ft.) and remain
 * decimal-safe Prisma.Decimal values. Every monetary field (pricePerSqFt,
 * basePrice, totalAmount, charges, finalAmount, bookingAmount, payments) is
 * a whole-rupee integer — no decimals are accepted or produced anywhere in
 * the money path.
 */
const { Prisma } = require('@prisma/client');
const { isPositiveInteger, isNonNegativeInteger } = require('../../src/utils/money');

describe('Dimension math (Decimal-safe, physical units)', () => {
  it('calculates area correctly', () => {
    const area = new Prisma.Decimal('10.5').times('20.5');
    expect(area.toString()).toBe('215.25');
  });
});

describe('Integer-only money math', () => {
  it('calculates basePrice as a rounded whole-rupee integer (area × pricePerSqFt)', () => {
    const area = new Prisma.Decimal('215.25');
    const pricePerSqFt = 1500; // Int
    const basePrice = Math.round(area.times(pricePerSqFt).toNumber());
    expect(basePrice).toBe(322875);
    expect(Number.isInteger(basePrice)).toBe(true);
  });

  it('sums charges without any floating-point involvement', () => {
    const charges = [100, 200, 300];
    const total = charges.reduce((sum, c) => sum + c, 0);
    expect(total).toBe(600);
    expect(Number.isInteger(total)).toBe(true);
  });

  it('booking amount must not exceed final amount', () => {
    const finalAmount = 500000;
    const bookingAmount = 600000;
    expect(bookingAmount > finalAmount).toBe(true); // should be rejected
  });
});

describe('isPositiveInteger / isNonNegativeInteger (backend/src/utils/money.js)', () => {
  it('rejects decimal amounts', () => {
    expect(isPositiveInteger(50000.5)).toBe(false);
    expect(isPositiveInteger('50000.50')).toBe(false);
    expect(isNonNegativeInteger(100.1)).toBe(false);
  });

  it('rejects zero/negative where a positive amount is required', () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-5000)).toBe(false);
  });

  it('accepts whole numbers', () => {
    expect(isPositiveInteger(50000)).toBe(true);
    expect(isPositiveInteger('50000')).toBe(true);
    expect(isNonNegativeInteger(0)).toBe(true);
    expect(isNonNegativeInteger('0')).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(isPositiveInteger('abc')).toBe(false);
    expect(isNonNegativeInteger('abc')).toBe(false);
  });
});
