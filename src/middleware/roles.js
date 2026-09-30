// Níveis de permissão (maior = mais poder)
const ROLES = {
  viewer: 1,
  editor: 2,
  admin: 3,
  admin_master: 4
};

// Middleware que verifica se o usuário tem o nível mínimo
const requireRole = (minimumRole) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!ROLES[userRole]) {
      return res.status(403).json({ error: 'Role inválida' });
    }

    if (ROLES[userRole] < ROLES[minimumRole]) {
      return res.status(403).json({ 
        error: 'Acesso negado. Você não tem permissão para esta ação.' 
      });
    }

    next();
  };
};

module.exports = { requireRole, ROLES };