// Middleware pra rotas não encontradas (404)
const notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
};

// Middleware global de erros (500)
const errorHandler = (err, req, res, next) => {
  console.error('Erro:', err.message);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erro interno do servidor' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };