require('dotenv').config();
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const manualRoutes = require('./src/routes/manualRoutes');
const sectionRoutes = require('./src/routes/sectionRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const authMiddleware = require('./src/middleware/auth');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const cors = require('cors');
const app = express();

// Atrás de proxy (Render, Fly, etc.) defina TRUST_PROXY=1 para req.ip ser o IP real do
// cliente - usado pelo rate limit e pelos audit logs. Localmente, deixe sem definir.
if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

app.use(cors());
const PORT = process.env.PORT || 3000;
const userRoutes = require('./src/routes/userRoutes');
const logoRoutes = require('./src/routes/logoRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const toolRoutes = require('./src/routes/toolRoutes');
const publicRoutes = require('./src/routes/publicRoutes');
const returnRoutes = require('./src/routes/returnRoutes');
const sizeChartRoutes = require('./src/routes/sizeChartRoutes');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Rotas públicas (sem auth)
app.use('/portal', publicRoutes);
app.use('/portal', sizeChartRoutes);
// Rotas
app.get('/', (req, res) => {
  res.send('Operations Portal rodando! 🚀');
});
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/manuals', manualRoutes);
app.use('/sections', sectionRoutes);
app.use('/audit-logs', auditRoutes);
app.use('/tools', toolRoutes);
app.use('/templates', templateRoutes);
app.use('/logos', logoRoutes);
app.use('/returns', returnRoutes);

app.get('/me', authMiddleware, (req, res) => {
  res.json({ message: 'Você está autenticado!', user: req.user });
});

// Tratamento de erros (SEMPRE no final, depois de todas as rotas)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});