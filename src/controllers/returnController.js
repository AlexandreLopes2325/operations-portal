const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Listar devoluções (com filtros opcionais)
const getReturns = async (req, res) => {
  try {
    const { channel, status, from, to, search } = req.query;

    let query = supabase
      .from('returns')
      .select('*, users:created_by (name)')
      .order('created_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('request_date', from);
    if (to) query = query.lte('request_date', to);
    if (search) {
      const term = search.replace(/[%_]/g, '').trim();
      if (term) {
        query = query.or(`order_number.ilike.%${term}%,product.ilike.%${term}%,reason.ilike.%${term}%,channel_return_id.ilike.%${term}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar uma devolução por ID
const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('returns')
      .select('*, users:created_by (name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Devolução não encontrada' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Estatísticas pro dashboard
const getReturnStats = async (req, res) => {
  try {
    const { from, to } = req.query;

    let query = supabase.from('returns').select('*');
    if (from) query = query.gte('request_date', from);
    if (to) query = query.lte('request_date', to);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const total = data.length;
    const valorDevolucao = data.reduce((sum, r) => sum + Number(r.product_value || 0), 0);
    const prejuizoReal = data
      .filter(r => r.has_penalty)
      .reduce((sum, r) => sum + Number(r.penalty_value || 0), 0);
    const reclamacoesAbertas = data.filter(r => r.has_complaint && r.status !== 'finalizado').length;

    const porCanal = {};
    const porMotivo = {};
    const porMes = {};
    for (const r of data) {
      porCanal[r.channel] = (porCanal[r.channel] || 0) + 1;
      porMotivo[r.reason] = (porMotivo[r.reason] || 0) + 1;

      const refDate = r.request_date || r.created_at;
      const mesKey = refDate ? refDate.slice(0, 7) : null; // YYYY-MM
      if (mesKey) {
        if (!porMes[mesKey]) porMes[mesKey] = { valorDevolucao: 0, prejuizoReal: 0 };
        porMes[mesKey].valorDevolucao += Number(r.product_value || 0);
        if (r.has_penalty) porMes[mesKey].prejuizoReal += Number(r.penalty_value || 0);
      }
    }

    res.json({
      total,
      valorDevolucao,
      prejuizoReal,
      reclamacoesAbertas,
      porCanal,
      porMotivo,
      porMes
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar devolução
const createReturn = async (req, res) => {
  try {
    const {
      order_number, channel, product, reason, condition,
      request_date, received_date, has_complaint, quarantine_start,
      quarantine_days, complaint_details, product_value, has_penalty,
      penalty_value, refunded, status, notes, channel_return_id
    } = req.body;

    if (!order_number || !channel || !product || !reason) {
      return res.status(400).json({ error: 'Pedido, canal, produto e motivo são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('returns')
      .insert({
        order_number, channel, product, reason,
        condition: condition || null,
        request_date: request_date || null,
        received_date: received_date || null,
        has_complaint: !!has_complaint,
        quarantine_start: has_complaint ? (quarantine_start || null) : null,
        quarantine_days: has_complaint ? (quarantine_days || null) : null,
        complaint_details: has_complaint ? (complaint_details || null) : null,
        product_value: product_value || 0,
        has_penalty: !!has_penalty,
        penalty_value: has_penalty ? (penalty_value || 0) : null,
        refunded: !!refunded,
        status: status || 'aguardando_retorno',
        notes: notes || null,
        channel_return_id: channel_return_id || null,
        created_by: req.user.id
      })
      .select('*, users:created_by (name)')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'RETURN_CREATE', { order_number, channel, product }, req.ip);

    res.status(201).json({ message: 'Devolução registrada com sucesso!', return: data });
  } catch (err) {
    console.error('Erro ao criar devolução:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar devolução
const updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      order_number, channel, product, reason, condition,
      request_date, received_date, has_complaint, quarantine_start,
      quarantine_days, complaint_details, product_value, has_penalty,
      penalty_value, refunded, status, notes, channel_return_id
    } = req.body;

    const { data, error } = await supabase
      .from('returns')
      .update({
        order_number, channel, product, reason,
        condition: condition || null,
        request_date: request_date || null,
        received_date: received_date || null,
        has_complaint: !!has_complaint,
        quarantine_start: has_complaint ? (quarantine_start || null) : null,
        quarantine_days: has_complaint ? (quarantine_days || null) : null,
        complaint_details: has_complaint ? (complaint_details || null) : null,
        product_value: product_value || 0,
        has_penalty: !!has_penalty,
        penalty_value: has_penalty ? (penalty_value || 0) : null,
        refunded: !!refunded,
        status,
        notes: notes || null,
        channel_return_id: channel_return_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, users:created_by (name)');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Devolução não encontrada (pode já ter sido deletada)' });
    }

    await logAction(req.user.id, 'RETURN_UPDATE', { order_number, status }, req.ip);

    res.json({ message: 'Devolução atualizada com sucesso!', return: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Marca uma devolução como resolvida (usado pra quarentenas vencidas) - registra o que foi
// feito e conclui, mudando o status pra finalizado
const resolveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, marketplace_favor, seller_reimbursed } = req.body;

    if (!resolution_notes || !resolution_notes.trim()) {
      return res.status(400).json({ error: 'Descreva o que foi resolvido' });
    }

    const { data, error } = await supabase
      .from('returns')
      .update({
        status: 'finalizado',
        resolution_notes: resolution_notes.trim(),
        marketplace_favor: marketplace_favor === null || marketplace_favor === undefined ? null : !!marketplace_favor,
        seller_reimbursed: seller_reimbursed === null || seller_reimbursed === undefined ? null : !!seller_reimbursed,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, users:created_by (name)');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Devolução não encontrada' });
    }

    await logAction(req.user.id, 'RETURN_RESOLVE', { order_number: data[0].order_number, resolution_notes: resolution_notes.trim() }, req.ip);

    res.json({ message: 'Devolução marcada como concluída!', return: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Reabre uma devolução, voltando pra quarentena e limpando a resolução - tipo um "control Z".
// Exclusivo de admin_master (checado na rota), não é uma permissão delegável.
const reopenReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('returns')
      .update({
        status: 'quarentena',
        resolution_notes: null,
        resolved_at: null,
        marketplace_favor: null,
        seller_reimbursed: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, users:created_by (name)');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Devolução não encontrada' });
    }

    await logAction(req.user.id, 'RETURN_REOPEN', { order_number: data[0].order_number }, req.ip);

    res.json({ message: 'Devolução reaberta e voltou pra quarentena!', return: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar devolução
const deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('returns')
      .select('order_number')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('returns').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'RETURN_DELETE', { order_number: existing?.order_number }, req.ip);

    res.json({ message: 'Devolução deletada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Listar motivos (opcionalmente por canal)
const getReasons = async (req, res) => {
  try {
    const { channel } = req.query;

    let query = supabase.from('return_reasons').select('*').order('sort_order', { ascending: true });
    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar motivo
const createReason = async (req, res) => {
  try {
    const { channel, label } = req.body;

    if (!channel || !label) {
      return res.status(400).json({ error: 'Canal e motivo são obrigatórios' });
    }

    const { data: existing } = await supabase
      .from('return_reasons')
      .select('sort_order')
      .eq('channel', channel)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('return_reasons')
      .insert({ channel, label, sort_order: nextOrder })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ message: 'Motivo criado com sucesso!', reason: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar motivo (editar label ou ativar/desativar)
const updateReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, is_active } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('return_reasons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Motivo atualizado com sucesso!', reason: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar motivo
const deleteReason = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('return_reasons').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Motivo deletado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

function slugify(str) {
  const ascii = str.toLowerCase().normalize('NFD').split('').filter(ch => ch.charCodeAt(0) < 128).join('');
  return ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Listar canais/marketplaces
const getChannels = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('return_channels')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar canal/marketplace novo
const createChannel = async (req, res) => {
  try {
    const { label, requires_return_id } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Nome do marketplace é obrigatório' });
    }

    const key = slugify(label);

    const { data: existing } = await supabase
      .from('return_channels')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('return_channels')
      .insert({ key, label, sort_order: nextOrder, requires_return_id: !!requires_return_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Já existe um marketplace com esse nome' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ message: 'Marketplace criado com sucesso!', channel: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar canal (editar nome, ativar/desativar ou exigir ID de devolução do marketplace)
const updateChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, is_active, requires_return_id } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (requires_return_id !== undefined) updateData.requires_return_id = !!requires_return_id;

    const { data, error } = await supabase
      .from('return_channels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Marketplace atualizado com sucesso!', channel: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getReturns, getReturnById, getReturnStats, createReturn, updateReturn, deleteReturn, resolveReturn, reopenReturn,
  getReasons, createReason, updateReason, deleteReason,
  getChannels, createChannel, updateChannel
};
