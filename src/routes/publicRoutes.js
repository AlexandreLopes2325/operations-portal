const express = require('express');
const router = express.Router();
const { homepage, publicManual, publicTool, toolEmbed } = require('../controllers/publicController');

// Sem autenticação — qualquer pessoa acessa
router.get('/', homepage);
router.get('/guia/:slug', publicManual);
router.get('/ferramenta/:slug', publicTool);
router.get('/ferramenta/:slug/embed', toolEmbed);

module.exports = router;