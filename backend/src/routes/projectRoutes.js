const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  createProject,
  listProjects,
  getProject,
  updateProject,
} = require('../controllers/projectController');

const CRM = ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'];
const MANAGERS = ['ADMIN', 'MANAGER'];

router.post('/', authenticate, authorize(...MANAGERS), createProject);
router.get('/', authenticate, authorize(...CRM), listProjects);
router.get('/:id', authenticate, authorize(...CRM), getProject);
router.put('/:id', authenticate, authorize(...MANAGERS), updateProject);

module.exports = router;
