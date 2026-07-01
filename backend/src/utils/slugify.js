/**
 * Convert a company name to a URL-safe slug.
 * e.g. "Demo Estate" → "demo-estate"
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
};

module.exports = slugify;
