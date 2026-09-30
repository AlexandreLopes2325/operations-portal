const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Listar templates
const getTemplates = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('manuals')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Salvar manual como template
const saveAsTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar manual original
    const { data: manual } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .single();

    if (!manual) {
      return res.status(404).json({ error: 'Manual não encontrado' });
    }

    // Criar cópia como template
    const { data: template, error: templateError } = await supabase
      .from('manuals')
      .insert({
        title: `[Template] ${manual.title}`,
        description: manual.description,
        slug: `template-${manual.slug}-${Date.now()}`,
        is_template: true,
        status: 'draft',
        created_by: req.user.id
      })
      .select()
      .single();

    if (templateError) {
      return res.status(500).json({ error: templateError.message });
    }

    // Copiar seções do manual pro template
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('manual_id', id)
      .order('sort_order', { ascending: true });

    if (sections && sections.length > 0) {
      const newSections = sections.map(s => ({
        manual_id: template.id,
        type: s.type,
        content: s.content,
        color: s.color,
        sort_order: s.sort_order
      }));

      await supabase.from('sections').insert(newSections);
    }

    await logAction(req.user.id, 'TEMPLATE_CREATE', { title: template.title, from_manual: manual.title }, req.ip);

    res.status(201).json({
      message: 'Template criado com sucesso!',
      template
    });
  } catch (err) {
    console.error('Erro ao criar template:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar manual a partir de template
const createFromTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, slug } = req.body;

    // Buscar template
    const { data: template } = await supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .eq('is_template', true)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    // Criar novo manual
    const { data: newManual, error: manualError } = await supabase
      .from('manuals')
      .insert({
        title,
        description: description || template.description,
        slug,
        is_template: false,
        status: 'draft',
        created_by: req.user.id
      })
      .select()
      .single();

    if (manualError) {
      return res.status(500).json({ error: manualError.message });
    }

    // Copiar seções do template
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('manual_id', id)
      .order('sort_order', { ascending: true });

    if (sections && sections.length > 0) {
      const newSections = sections.map(s => ({
        manual_id: newManual.id,
        type: s.type,
        content: s.content,
        color: s.color,
        sort_order: s.sort_order
      }));

      await supabase.from('sections').insert(newSections);
    }

    await logAction(req.user.id, 'MANUAL_CREATE_FROM_TEMPLATE', { title, template: template.title }, req.ip);

    res.status(201).json({
      message: 'Manual criado a partir do template!',
      manual: newManual
    });
  } catch (err) {
    console.error('Erro ao criar do template:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('manuals')
      .delete()
      .eq('id', id)
      .eq('is_template', true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'TEMPLATE_DELETE', { id }, req.ip);

    res.json({ message: 'Template deletado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getTemplates, saveAsTemplate, createFromTemplate, deleteTemplate };