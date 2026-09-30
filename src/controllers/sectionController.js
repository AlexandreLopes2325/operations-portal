const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Listar seções de um manual
const getSections = async (req, res) => {
  try {
    const { manualId } = req.params;

    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('manual_id', manualId)
      .order('sort_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar nova seção
const createSection = async (req, res) => {
  try {
    const { manualId } = req.params;
    const { type, content, color, sort_order } = req.body;

    const { data, error } = await supabase
      .from('sections')
      .insert({
        manual_id: manualId,
        type,
        content,
        color,
        sort_order: sort_order || 0
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'SECTION_CREATE', { manual_id: manualId, type }, req.ip);

    res.status(201).json({
      message: 'Seção criada com sucesso!',
      section: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar seção
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, color, sort_order } = req.body;

    const { data, error } = await supabase
      .from('sections')
      .update({
        type,
        content,
        color,
        sort_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    await logAction(req.user.id, 'SECTION_UPDATE', { id, type }, req.ip);
    res.json({
      message: 'Seção atualizada com sucesso!',
      section: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar seção
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    await logAction(req.user.id, 'SECTION_DELETE', { id }, req.ip);
    res.json({ message: 'Seção deletada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getSections,
  createSection,
  updateSection,
  deleteSection
};