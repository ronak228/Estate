const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { companyBrandingUploader } = require('../middleware/uploadMiddleware');
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
  getEmployee,
  updateEmployee,
  updateEmployeeStatus,
  resetEmployeePassword,
} = require('../controllers/companyController');

// ─── SUPER_ADMIN routes ───────────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN'), createCompany);
router.get('/', authenticate, authorize('SUPER_ADMIN'), listCompanies);

// Important: /me routes must be registered BEFORE /:id to avoid "me" being
// treated as a UUID parameter.
// Company Settings is an ADMIN-only surface end to end — MANAGER/SALES_EXECUTIVE
// must not be able to read or write it, not just be kept off the settings page.
// (Their own company name/logo for branding come from /auth/me, not this route.)
router.get('/me', authenticate, authorize('ADMIN'), getMyCompany);
router.put(
  '/me/settings',
  authenticate,
  authorize('ADMIN'),
  companyBrandingUploader.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]),
  updateMyCompanySettings
);
router.post('/me/employees', authenticate, authorize('ADMIN'), createEmployee);
router.get('/me/employees', authenticate, authorize('ADMIN', 'MANAGER'), listEmployees);
router.get('/me/employees/:id', authenticate, authorize('ADMIN', 'MANAGER'), getEmployee);
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
