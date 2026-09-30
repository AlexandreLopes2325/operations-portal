const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const {
  getTemplates,
  saveAsTemplate,
  createFromTemplate,
  deleteTemplate
} = require('../controllers/templateController');

router.get('/', authMiddleware, requirePermission('templates', 'view'), getTemplates);
router.post('/save/:id', authMiddleware, requirePermission('templates', 'edit'), saveAsTemplate);
router.post('/use/:id', authMiddleware, requirePermission('templates', 'create'), createFromTemplate);
router.delete('/:id', authMiddleware, requirePermission('templates', 'delete'), deleteTemplate);

module.exports = router;