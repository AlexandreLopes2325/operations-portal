const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Pegar o token do header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // O token vem como "Bearer eyJhbG..."
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  try {
    // Verificar se o token é válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Salvar dados do usuário na requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    // Continuar pra próxima função
    next();

  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

module.exports = authMiddleware;