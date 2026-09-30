const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { getLogs } = require('../controllers/auditController');

router.get('/', authMiddleware, requirePermission('audit_logs', 'view'), getLogs);

module.exports = router;