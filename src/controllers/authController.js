const { logAction } = require('./auditController');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { defaultPermissionsForRole } = require('../config/permissions');

// Registrar novo usuário
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Só um Admin Master pode criar outro Admin Master
    if (role === 'admin_master' && req.user.role !== 'admin_master') {
      return res.status(403).json({ error: 'Apenas um Admin Master pode criar outro Admin Master' });
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criptografar senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Inserir no banco
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        role: role || 'viewer'
      })
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Registrar no audit log
    await logAction(newUser.id, 'USER_REGISTER', { email: newUser.email, role: newUser.role }, req.ip);

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: newUser
    });

  } catch (err) {
    console.error('Erro no register:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário pelo email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Comparar senha
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Gerar JWT (expira em 24h)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Registrar no audit log
    await logAction(user.id, 'USER_LOGIN', { email: user.email }, req.ip);

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || defaultPermissionsForRole(user.role)
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { register, login };