const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validateManual } = require('../middleware/validate');
const {
  getManuals,
  getManualById,
  createManual,
  updateManual,
  deleteManual
} = require('../controllers/manualController');

router.get('/', authMiddleware, requirePermission('manuals', 'view'), getManuals);
router.get('/:id', authMiddleware, requirePermission('manuals', 'view'), getManualById);
router.post('/', authMiddleware, requirePermission('manuals', 'create'), validateManual, createManual);
router.put('/:id', authMiddleware, requirePermission('manuals', 'edit'), validateManual, updateManual);
router.delete('/:id', authMiddleware, requirePermission('manuals', 'delete'), deleteManual);

module.exports = router;