const supabase = require('../lib/supabase');

// Função pra registrar uma ação (vai ser usada em todo o sistema)
const logAction = async (userId, action, details, ip) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        details,
        ip_address: ip
      });
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
};

// Listar logs (só admins)
const getLogs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { logAction, getLogs };