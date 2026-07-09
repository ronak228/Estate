const fs = require('fs');

/**
 * Magic-byte signatures for the file types this app accepts on document
 * uploads (bookings, contracts). The client-supplied multipart Content-Type
 * is attacker-controlled — this checks actual file bytes so a renamed/relabeled
 * file (e.g. an .html/.svg saved with a spoofed "application/pdf" or
 * "image/png" Content-Type) can't be stored under a false type (P2-15 fix,
 * 2026-07-08).
 */
const SIGNATURES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // image/webp is checked separately below (RIFF....WEBP is not one contiguous run)
};

const matchesSignature = (buffer, signature) =>
  signature.every((byte, i) => buffer[i] === byte);

/**
 * Returns true if the file at filePath's leading bytes match a known
 * signature for declaredMime. Returns true (no-op) for any MIME type with no
 * signature registered here, so this only tightens types we explicitly know.
 */
const verifyFileSignature = (filePath, declaredMime) => {
  let buffer;
  try {
    const fd = fs.openSync(filePath, 'r');
    buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
  } catch {
    return false; // unreadable file — treat as invalid rather than throwing
  }

  if (declaredMime === 'image/webp') {
    return (
      matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
      buffer.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }

  const signatures = SIGNATURES[declaredMime];
  if (!signatures) return true;

  return signatures.some((sig) => matchesSignature(buffer, sig));
};

module.exports = { verifyFileSignature };
