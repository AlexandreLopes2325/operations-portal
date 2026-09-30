const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Mesmo formato de erro das outras rotas ({ error }), que o frontend já sabe exibir
const limiter = (limit, message, extra = {}) => rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: message },
  ...extra
});

// Login: só tentativas que FALHAM contam, pra não travar uma equipe inteira atrás do mesmo IP
const loginLimiter = limiter(20, 'Muitas tentativas de login. Tente novamente em 15 minutos.', {
  skipSuccessfulRequests: true
});

// Esqueci a senha: evita spam de e-mails
const forgotPasswordLimiter = limiter(5, 'Muitas solicitações de recuperação. Tente novamente em 15 minutos.');

// Reset: complementa o limite de 5 tentativas por código
const resetPasswordLimiter = limiter(10, 'Muitas tentativas de redefinição. Tente novamente em 15 minutos.');

module.exports = { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter };
