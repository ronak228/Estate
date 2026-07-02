/**
 * Unit tests for the getPagination utility (BUG-015 / BUG-029).
 */
const { getPagination, MAX_PAGE_SIZE } = require('../../src/utils/pagination');

describe('getPagination', () => {
  it('returns default values for empty query', () => {
    const result = getPagination({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('parses valid page and pageSize', () => {
    const result = getPagination({ page: '3', pageSize: '10' });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it('clamps pageSize to MAX_PAGE_SIZE', () => {
    const result = getPagination({ pageSize: '999' });
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    expect(result.take).toBe(MAX_PAGE_SIZE);
  });

  it('defaults page to 1 for invalid values', () => {
    const result = getPagination({ page: 'abc', pageSize: '0' });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20); // falls back to default
  });

  it('respects custom defaultPageSize', () => {
    const result = getPagination({}, { defaultPageSize: 100 });
    expect(result.pageSize).toBe(100);
  });
});
