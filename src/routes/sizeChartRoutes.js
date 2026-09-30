const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const {
  getPublicLogos,
  getSizeCharts, getSizeChartById, createSizeChart, updateSizeChart, deleteSizeChart
} = require('../controllers/sizeChartController');

// Leitura é pública de propósito — usada pela ferramenta embarcada no portal público
router.get('/logos', getPublicLogos);
router.get('/size-charts', getSizeCharts);
router.get('/size-charts/:id', getSizeChartById);

// Escrita exige login. Salvar/atualizar = quem pode usar ferramentas (tools.view);
// apagar = quem pode editar ferramentas (tools.edit, admin por padrão).
// A ferramenta precisa enviar o header Authorization: Bearer <token>.
router.post('/size-charts', authMiddleware, requirePermission('tools', 'view'), createSizeChart);
router.put('/size-charts/:id', authMiddleware, requirePermission('tools', 'view'), updateSizeChart);
router.delete('/size-charts/:id', authMiddleware, requirePermission('tools', 'edit'), deleteSizeChart);

module.exports = router;
