const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');
const { RESOURCES, ACTIONS, defaultPermissionsForRole } = require('../config/permissions');

// Listar todos os usuários
const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, permissions, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const withPermissions = data.map(u => ({
      ...u,
      permissions: u.permissions || defaultPermissionsForRole(u.role)
    }));

    res.json(withPermissions);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar as permissões granulares de um usuário (aba por aba)
const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissões inválidas' });
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (targetUser.role === 'admin_master') {
      return res.status(400).json({ error: 'Admin Master sempre tem acesso total e não pode ser restringido' });
    }

    // Sanitiza: só aceita os recursos/ações conhecidos, com valores booleanos
    const cleanPermissions = {};
    for (const resource of RESOURCES) {
      cleanPermissions[resource] = {};
      for (const action of ACTIONS) {
        cleanPermissions[resource][action] = Boolean(permissions?.[resource]?.[action]);
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update({ permissions: cleanPermissions, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, role, permissions')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const granted = [];
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        if (cleanPermissions[resource][action]) granted.push(`${resource}.${action}`);
      }
    }

    await logAction(req.user.id, 'USER_PERMISSIONS_UPDATE', {
      target_user: id,
      target_name: targetUser.name,
      granted: granted.join(', ') || '(nenhuma)'
    }, req.ip);

    res.json({ message: `Permissões de ${targetUser.name} atualizadas com sucesso!`, user: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Mudar role do usuário
const changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['viewer', 'editor', 'admin', 'admin_master'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }

    // Reseta overrides de permissões customizadas ao mudar a role, pra evitar
    // combinações confusas entre role nova + permissões pensadas pra role antiga
    const { data, error } = await supabase
      .from('users')
      .update({ role, permissions: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, role, permissions')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'USER_ROLE_CHANGE', { target_user: id, new_role: role }, req.ip);

    res.json({ message: 'Role atualizada com sucesso!', user: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar usuário
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode deletar a si mesmo' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'USER_DELETE', { deleted_user: id }, req.ip);

    res.json({ message: 'Usuário deletado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Admin reseta senha de outro usuário
const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Não pode resetar a própria senha por aqui
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Use a função de trocar senha para sua própria conta' });
    }

    // Buscar o usuário alvo
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Admin não pode resetar senha de admin_master
    if (req.user.role === 'admin' && targetUser.role === 'admin_master') {
      return res.status(403).json({ error: 'Você não tem permissão para alterar a senha de um Admin Master' });
    }

    // Criptografar nova senha
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualizar senha
    await supabase
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', id);

    await logAction(req.user.id, 'ADMIN_RESET_PASSWORD', { target_user: id, target_name: targetUser.name }, req.ip);

    res.json({ message: `Senha de ${targetUser.name} redefinida com sucesso!` });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getUsers, changeRole, deleteUser, adminResetPassword, updatePermissions };