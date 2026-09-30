const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { getLogos, uploadLogo, deleteLogo, uploadImage } = require('../controllers/logoController');

router.get('/', authMiddleware, requirePermission('logos', 'view'), getLogos);
router.post('/', authMiddleware, requirePermission('logos', 'create'), uploadLogo);
// Upload de imagem genérica é usado dentro do editor de manuais, então segue a permissão de "manuals"
router.post('/upload-image', authMiddleware, requirePermission('manuals', 'edit'), uploadImage);
router.delete('/:id', authMiddleware, requirePermission('logos', 'delete'), deleteLogo);

module.exports = router;