const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Listar ferramentas
const getTools = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar ferramenta
const createTool = async (req, res) => {
  try {
    const { title, description, icon, slug, html_content } = req.body;

    let html_url = null;

    // Upload do HTML pro storage
    if (html_content) {
      const htmlBuffer = Buffer.from(html_content, 'utf-8');
      const { error: uploadError } = await supabase.storage
        .from('tools')
        .upload(`${slug}.html`, htmlBuffer, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        return res.status(500).json({ error: 'Erro no upload: ' + uploadError.message });
      }

      const { data: publicUrl } = supabase.storage
        .from('tools')
        .getPublicUrl(`${slug}.html`);

      html_url = publicUrl.publicUrl;
    }

    // Salvar no banco
    const { data, error } = await supabase
      .from('tools')
      .insert({
        title,
        description,
        icon: icon || '🔧',
        slug,
        html_url,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'TOOL_CREATE', { title, slug }, req.ip);

    res.status(201).json({
      message: 'Ferramenta criada com sucesso!',
      tool: data
    });
  } catch (err) {
    console.error('Erro ao criar ferramenta:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar ferramenta
const updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon, slug, html_content, is_active } = req.body;

    let html_url = undefined;

    // Re-upload do HTML se enviou conteúdo novo
    if (html_content) {
      const htmlBuffer = Buffer.from(html_content, 'utf-8');
      const { error: uploadError } = await supabase.storage
        .from('tools')
        .upload(`${slug}.html`, htmlBuffer, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        return res.status(500).json({ error: 'Erro no upload: ' + uploadError.message });
      }

      const { data: publicUrl } = supabase.storage
        .from('tools')
        .getPublicUrl(`${slug}.html`);

      html_url = publicUrl.publicUrl;
    }

    const updateData = {
      title,
      description,
      icon,
      slug,
      is_active,
      updated_at: new Date().toISOString()
    };

    if (html_url) {
      updateData.html_url = html_url;
    }

    const { data, error } = await supabase
      .from('tools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'TOOL_UPDATE', { title, slug }, req.ip);

    res.json({
      message: 'Ferramenta atualizada com sucesso!',
      tool: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar ferramenta
const deleteTool = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tool } = await supabase
      .from('tools')
      .select('*')
      .eq('id', id)
      .single();

    if (!tool) {
      return res.status(404).json({ error: 'Ferramenta não encontrada' });
    }

    // Deletar HTML do storage
    await supabase.storage
      .from('tools')
      .remove([`${tool.slug}.html`]);

    // Deletar do banco
    await supabase
      .from('tools')
      .delete()
      .eq('id', id);

    await logAction(req.user.id, 'TOOL_DELETE', { title: tool.title }, req.ip);

    res.json({ message: 'Ferramenta deletada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getTools, createTool, updateTool, deleteTool };