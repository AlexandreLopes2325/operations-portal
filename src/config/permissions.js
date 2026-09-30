const { ROLES } = require('../middleware/roles');

// Abas/recursos do painel que podem ser autorizados por usuário
const RESOURCES = ['manuals', 'templates', 'tools', 'logos', 'users', 'audit_logs', 'returns'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

// Role mínima que cada ação exige por padrão (null = ação não existe pro recurso)
const ROLE_MINIMUMS = {
  manuals:    { view: 'viewer', create: 'editor', edit: 'editor', delete: 'admin_master' },
  templates:  { view: 'viewer', create: 'editor', edit: 'admin',  delete: 'admin_master' },
  tools:      { view: 'viewer', create: 'admin',  edit: 'admin',  delete: 'admin_master' },
  logos:      { view: 'viewer', create: 'admin',  edit: null,     delete: 'admin_master' },
  users:      { view: 'admin',  create: 'admin',  edit: 'admin',  delete: null },
  audit_logs: { view: 'admin',  create: null,      edit: null,     delete: null },
  returns:    { view: 'viewer', create: 'editor', edit: 'editor', delete: 'admin' },
};

// Permissões padrão derivadas da role, usadas quando o usuário não tem overrides customizados
function defaultPermissionsForRole(role) {
  const level = ROLES[role] || 0;
  const perms = {};

  for (const resource of RESOURCES) {
    perms[resource] = {};
    for (const action of ACTIONS) {
      const minRole = ROLE_MINIMUMS[resource][action];
      perms[resource][action] = minRole ? level >= ROLES[minRole] : false;
    }
  }

  return perms;
}

module.exports = { RESOURCES, ACTIONS, ROLE_MINIMUMS, defaultPermissionsForRole };
