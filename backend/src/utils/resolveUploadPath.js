const path = require('path');
const fs = require('fs');

/**
 * Resolves a stored /uploads/... URL to an absolute filesystem path, only if
 * the file actually exists on disk. Returns null otherwise so callers (e.g. a
 * PDF header) can skip an optional asset instead of throwing on a missing or
 * stale reference.
 */
function resolveUploadPath(urlPath) {
  if (!urlPath) return null;
  const absolute = path.join(process.cwd(), urlPath);
  return fs.existsSync(absolute) ? absolute : null;
}

module.exports = resolveUploadPath;
