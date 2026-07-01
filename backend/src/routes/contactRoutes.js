const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  listContacts,
  getContact,
  updateContact,
  createInteraction,
  listInteractions,
} = require('../controllers/contactController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];

router.get('/', authenticate, authorize(...CRM), listContacts);
router.get('/:id', authenticate, authorize(...CRM), getContact);
router.put('/:id', authenticate, authorize(...CRM), updateContact);
router.post('/:id/interactions', authenticate, authorize(...CRM), createInteraction);
router.get('/:id/interactions', authenticate, authorize(...CRM), listInteractions);

module.exports = router;
