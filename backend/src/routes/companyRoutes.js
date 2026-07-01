const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { companyLogoUploader } = require('../middleware/uploadMiddleware');
const {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompanyStatus,
  setCompanyAdmin,
  getMyCompany,
  updateMyCompanySettings,
  createEmployee,
  listEmployees,
  updateEmployee,
  updateEmployeeStatus,
  resetEmployeePassword,
} = require('../controllers/companyController');

// ─── SUPER_ADMIN routes ───────────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN'), createCompany);
router.get('/', authenticate, authorize('SUPER_ADMIN'), listCompanies);

// Important: /me routes must be registered BEFORE /:id to avoid "me" being
// treated as a UUID parameter.
router.get('/me', authenticate, authorize('ADMIN', 'MANAGER', 'SALES_EXECUTIVE'), getMyCompany);
router.put(
  '/me/settings',
  authenticate,
  authorize('ADMIN'),
  companyLogoUploader.single('logo'),
  updateMyCompanySettings
);
router.post('/me/employees', authenticate, authorize('ADMIN'), createEmployee);
router.get('/me/employees', authenticate, authorize('ADMIN', 'MANAGER'), listEmployees);
router.put('/me/employees/:id', authenticate, authorize('ADMIN'), updateEmployee);
router.patch('/me/employees/:id/status', authenticate, authorize('ADMIN'), updateEmployeeStatus);
router.patch(
  '/me/employees/:id/reset-password',
  authenticate,
  authorize('ADMIN'),
  resetEmployeePassword
);

// Parameterized SUPER_ADMIN routes last to avoid shadowing /me/*
router.get('/:id', authenticate, authorize('SUPER_ADMIN'), getCompanyById);
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN'), updateCompanyStatus);
router.patch('/:id/admin', authenticate, authorize('SUPER_ADMIN'), setCompanyAdmin);

module.exports = router;
