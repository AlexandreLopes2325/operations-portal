const supabase = require('../lib/supabase');
const { defaultPermissionsForRole } = require('../config/permissions');

// Verifica se o usuário logado tem a permissão (resource, action) específica.
// admin_master sempre passa - é o único nível que não pode ser restringido.
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin_master') {
        return next();
      }

      const { data: userRow, error } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', req.user.id)
        .single();

      if (error || !userRow) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const perms = userRow.permissions || defaultPermissionsForRole(userRow.role);
      const allowed = perms?.[resource]?.[action];

      if (!allowed) {
        return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};

module.exports = { requirePermission };
