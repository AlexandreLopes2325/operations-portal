// Validar email
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validar senha forte (mínimo 8 chars, 1 maiúscula, 1 número, 1 símbolo)
const isStrongPassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
};

// Middleware: validar registro
const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Email inválido');
  }

  if (!password || !isStrongPassword(password)) {
    errors.push('Senha deve ter mínimo 8 caracteres, 1 maiúscula, 1 número e 1 símbolo');
  }

  const validRoles = ['viewer', 'editor', 'admin', 'admin_master'];
  if (role && !validRoles.includes(role)) {
    errors.push('Role inválida. Use: viewer, editor, admin ou admin_master');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Middleware: validar login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Email inválido');
  }

  if (!password || password.length === 0) {
    errors.push('Senha é obrigatória');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Middleware: validar manual
const validateManual = (req, res, next) => {
  const { title, slug } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Título deve ter pelo menos 3 caracteres');
  }

  if (!slug || slug.trim().length < 3) {
    errors.push('Slug deve ter pelo menos 3 caracteres');
  }

  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug deve conter apenas letras minúsculas, números e hífens');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Middleware: validar seção
const validateSection = (req, res, next) => {
  const { type, content } = req.body;
  const errors = [];

  const validTypes = ['title', 'subtitle', 'text', 'alert', 'table', 'image', 'step', 'checklist', 'divider'];
  if (!type || !validTypes.includes(type)) {
    errors.push(`Tipo inválido. Use: ${validTypes.join(', ')}`);
  }

  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    errors.push('Conteúdo deve ser um objeto JSON');
  } else if (type === 'subtitle') {
    if (content.text !== undefined && typeof content.text !== 'string') {
      errors.push('Subtítulo: text deve ser texto');
    }
    if (content.level !== undefined && !['h2', 'h3'].includes(content.level)) {
      errors.push('Subtítulo: level deve ser h2 ou h3');
    }
  } else if (type === 'divider') {
    if (content.style !== undefined && !['solid', 'dashed', 'dotted'].includes(content.style)) {
      errors.push('Divisor: style deve ser solid, dashed ou dotted');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

// Middleware: validar reset de senha
const validateResetPassword = (req, res, next) => {
  const { email, token, newPassword } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Email inválido');
  }

  // Código de recuperação: 32 caracteres hex (gerado em passwordController)
  if (typeof token !== 'string' || !/^[a-f0-9]{32}$/i.test(token.trim())) {
    errors.push('Código inválido');
  }

  if (!newPassword || !isStrongPassword(newPassword)) {
    errors.push('Nova senha deve ter mínimo 8 caracteres, 1 maiúscula, 1 número e 1 símbolo');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateManual,
  validateSection,
  validateResetPassword
};