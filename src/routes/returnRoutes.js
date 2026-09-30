const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { requireRole } = require('../middleware/roles');
const {
  getReturns, getReturnById, getReturnStats, createReturn, updateReturn, deleteReturn, resolveReturn, reopenReturn,
  getReasons, createReason, updateReason, deleteReason,
  getChannels, createChannel, updateChannel
} = require('../controllers/returnController');

// Rotas específicas primeiro (senão caem na /:id)
router.get('/stats', authMiddleware, requirePermission('returns', 'view'), getReturnStats);
router.get('/reasons', authMiddleware, requirePermission('returns', 'view'), getReasons);
router.post('/reasons', authMiddleware, requirePermission('returns', 'edit'), createReason);
router.put('/reasons/:id', authMiddleware, requirePermission('returns', 'edit'), updateReason);
router.delete('/reasons/:id', authMiddleware, requirePermission('returns', 'edit'), deleteReason);
router.get('/channels', authMiddleware, requirePermission('returns', 'view'), getChannels);
router.post('/channels', authMiddleware, requirePermission('returns', 'edit'), createChannel);
router.put('/channels/:id', authMiddleware, requirePermission('returns', 'edit'), updateChannel);

router.get('/', authMiddleware, requirePermission('returns', 'view'), getReturns);
router.post('/', authMiddleware, requirePermission('returns', 'create'), createReturn);
router.get('/:id', authMiddleware, requirePermission('returns', 'view'), getReturnById);
router.put('/:id', authMiddleware, requirePermission('returns', 'edit'), updateReturn);
router.put('/:id/resolve', authMiddleware, requirePermission('returns', 'edit'), resolveReturn);
// Reabrir/reverter é exclusivo do admin_master - não é uma permissão delegável
router.put('/:id/reopen', authMiddleware, requireRole('admin_master'), reopenReturn);
router.delete('/:id', authMiddleware, requirePermission('returns', 'delete'), deleteReturn);

module.exports = router;
