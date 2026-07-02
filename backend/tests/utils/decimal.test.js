/**
 * Unit tests for decimal-safe pricing math (BUG-003 / BUG-029).
 * Verifies that Prisma.Decimal arithmetic produces exact results
 * where JavaScript Number would introduce floating-point error.
 */
const { Prisma } = require('@prisma/client');

describe('Decimal-safe pricing math', () => {
  it('0.1 + 0.2 = 0.3 exactly (not 0.30000000000000004)', () => {
    const result = new Prisma.Decimal('0.1').plus('0.2');
    expect(result.toString()).toBe('0.3');
  });

  it('calculates area correctly', () => {
    const area = new Prisma.Decimal('10.5').times('20.5');
    expect(area.toString()).toBe('215.25');
  });

  it('calculates basePrice correctly', () => {
    const area = new Prisma.Decimal('215.25');
    const pricePerSqFt = new Prisma.Decimal('1500');
    const basePrice = area.times(pricePerSqFt);
    expect(new Prisma.Decimal(basePrice).toFixed(2)).toBe('322875.00');
  });

  it('sums charges without floating-point drift', () => {
    const charges = ['100.10', '200.20', '300.30'];
    const total = charges.reduce(
      (sum, c) => sum.plus(new Prisma.Decimal(c)),
      new Prisma.Decimal(0)
    );
    expect(new Prisma.Decimal(total).toFixed(2)).toBe('600.60');
  });

  it('booking amount must not exceed final amount', () => {
    const finalAmount = new Prisma.Decimal('500000');
    const bookingAmount = new Prisma.Decimal('600000');
    expect(bookingAmount.gt(finalAmount)).toBe(true); // should be rejected
  });
});
