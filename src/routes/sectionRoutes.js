const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { validateSection } = require('../middleware/validate');
const {
  getSections,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sectionController');

// Seções são parte do conteúdo de um manual, então seguem a permissão de "manuals"
router.get('/manual/:manualId', authMiddleware, requirePermission('manuals', 'view'), getSections);
router.post('/manual/:manualId', authMiddleware, requirePermission('manuals', 'edit'), validateSection, createSection);
router.put('/:id', authMiddleware, requirePermission('manuals', 'edit'), validateSection, updateSection);
router.delete('/:id', authMiddleware, requirePermission('manuals', 'edit'), deleteSection);

module.exports = router;