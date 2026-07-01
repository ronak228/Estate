const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createUnit, listUnits, getUnit, updateUnit, updateUnitStatus } = require('../controllers/unitController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

router.post('/', authenticate, authorize(...MANAGERS), createUnit);
router.get('/', authenticate, authorize(...CRM), listUnits);
router.get('/:id', authenticate, authorize(...CRM), getUnit);
router.put('/:id', authenticate, authorize(...MANAGERS), updateUnit);
router.patch('/:id/status', authenticate, authorize(...MANAGERS), updateUnitStatus);

module.exports = router;
