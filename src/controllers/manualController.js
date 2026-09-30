const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Roles que podem gravar custom_html (HTML servido sem escape no portal público)
const CUSTOM_HTML_ROLES = ['admin', 'admin_master'];


// Listar todos os manuais
const getManuals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .eq('is_template', false)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar manual por ID
const getManualById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Manual não encontrado' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo manual
const createManual = async (req, res) => {
  try {
    const { title, description, slug, is_template } = req.body;

    const { data, error } = await supabase
      .from('manuals')
      .insert({
        title,
        description,
        slug,
        is_template: is_template || false,
        created_by: req.user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'MANUAL_CREATE', { title, slug }, req.ip);

    res.status(201).json({
      message: 'Manual criado com sucesso!',
      manual: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar manual
const updateManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, slug, status, custom_html } = req.body;

    // custom_html é servido SEM escape no portal público (HTML/JS livre), então só
    // admin e admin_master podem gravá-lo ou removê-lo. A role vem do banco, não do JWT,
    // pra um rebaixamento de role valer na hora. Editores continuam editando o resto.
    if (custom_html !== undefined) {
      const { data: author } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (!author || !CUSTOM_HTML_ROLES.includes(author.role)) {
        return res.status(403).json({ error: 'Apenas Admin e Admin Master podem alterar o HTML customizado.' });
      }
    }

    const updateData = {
      title,
      description,
      slug,
      status,
      updated_at: new Date().toISOString()
    };

    if (custom_html !== undefined) {
      updateData.custom_html = custom_html;
    }

    const { data, error } = await supabase
      .from('manuals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    await logAction(req.user.id, 'MANUAL_UPDATE', { id, title }, req.ip);
    res.json({
      message: 'Manual atualizado com sucesso!',
      manual: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar manual (só Admin Master)
const deleteManual = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('manuals')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    await logAction(req.user.id, 'MANUAL_DELETE', { id }, req.ip);

    res.json({ message: 'Manual deletado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getManuals,
  getManualById,
  createManual,
  updateManual,
  deleteManual
};