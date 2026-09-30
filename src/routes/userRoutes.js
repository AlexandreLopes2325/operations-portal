const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { requirePermission } = require('../middleware/permissions');
const { getUsers, changeRole, deleteUser, adminResetPassword, updatePermissions } = require('../controllers/userController');

router.get('/', authMiddleware, requirePermission('users', 'view'), getUsers);
router.put('/:id/permissions', authMiddleware, requireRole('admin_master'), updatePermissions);
router.put('/:id/role', authMiddleware, requireRole('admin_master'), changeRole);
router.put('/:id/reset-password', authMiddleware, requirePermission('users', 'edit'), adminResetPassword);
router.delete('/:id', authMiddleware, requireRole('admin_master'), deleteUser);

module.exports = router;