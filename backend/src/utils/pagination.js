/**
 * Pagination helper (BUG-015).
 *
 * Parses and CLAMPS client-supplied pagination params so a caller can never
 * request an unbounded page. Returns normalized { page, pageSize, skip, take }.
 *
 *   - page:     integer >= 1 (defaults to 1)
 *   - pageSize: integer within [1, MAX_PAGE_SIZE] (defaults to DEFAULT_PAGE_SIZE)
 */

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const getPagination = (query = {}, { defaultPageSize = DEFAULT_PAGE_SIZE } = {}) => {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.pageSize, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
};

module.exports = { getPagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
