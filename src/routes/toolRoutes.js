const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { getTools, createTool, updateTool, deleteTool } = require('../controllers/toolController');

router.get('/', authMiddleware, requirePermission('tools', 'view'), getTools);
router.post('/', authMiddleware, requirePermission('tools', 'create'), createTool);
router.put('/:id', authMiddleware, requirePermission('tools', 'edit'), updateTool);
router.delete('/:id', authMiddleware, requirePermission('tools', 'delete'), deleteTool);

module.exports = router;