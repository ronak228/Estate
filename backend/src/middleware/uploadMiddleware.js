const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Build a multer instance for a given upload subfolder.
 * Files are stored on local disk under /uploads/{subfolder}/
 */
const createUploader = (subfolder, allowedMimes, maxSizeMb = 5) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', subfolder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedMimes.join(', ')}`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
  });
};

// Company logo uploader — images only, max 2 MB
const companyLogoUploader = createUploader(
  'companies',
  ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  2
);

// Booking document uploader — PDFs and images, max 10 MB
const documentUploader = createUploader(
  'documents',
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  10
);

// Booking-specific document uploader — stored under /uploads/bookings/
const bookingDocumentUploader = createUploader(
  'bookings',
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  10
);

module.exports = { companyLogoUploader, documentUploader, bookingDocumentUploader };
