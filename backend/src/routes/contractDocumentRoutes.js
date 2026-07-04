const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  uploadContractDocument,
  listContractDocuments,
  updateSignatureStatus,
  deleteContractDocument,
} = require('../controllers/contractDocumentController');
const { contractDocumentUploader } = require('../middleware/uploadMiddleware');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

// POST   /api/bookings/:id/contract-documents        — upload a contract document
// GET    /api/bookings/:id/contract-documents        — list all contract documents for the booking
// PATCH  /api/bookings/:id/contract-documents/:documentId/signature — update signature status
// DELETE /api/bookings/:id/contract-documents/:documentId — delete a contract document

router.post(
  '/',
  authenticate,
  authorize(...CRM),
  contractDocumentUploader.single('file'),
  uploadContractDocument
);

router.get('/', authenticate, authorize(...CRM), listContractDocuments);

router.patch(
  '/:documentId/signature',
  authenticate,
  authorize(...MANAGERS),
  updateSignatureStatus
);

router.delete('/:documentId', authenticate, authorize(...MANAGERS), deleteContractDocument);

module.exports = router;
