const supabase = require('../lib/supabase');

// Logos da biblioteca compartilhada (usado pelo seletor de logo da ferramenta)
const getPublicLogos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('logos')
      .select('id, brand_name, svg_url, png_url')
      .order('brand_name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Listar tabelas de medidas salvas (com filtros)
const getSizeCharts = async (req, res) => {
  try {
    const { category, brand, search } = req.query;

    let query = supabase
      .from('size_charts')
      .select('id, title, brand, category, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (brand) query = query.eq('brand', brand);
    if (search) {
      const term = search.replace(/[%_]/g, '').trim();
      if (term) {
        query = query.or(`title.ilike.%${term}%,brand.ilike.%${term}%`);
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

// Buscar uma tabela de medidas por ID (com os dados completos)
const getSizeChartById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('size_charts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Tabela não encontrada' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar uma tabela de medidas nova na galeria
const createSizeChart = async (req, res) => {
  try {
    const { title, brand, category, data } = req.body;

    if (!title || !data) {
      return res.status(400).json({ error: 'Título e dados da tabela são obrigatórios' });
    }

    const { data: created, error } = await supabase
      .from('size_charts')
      .insert({
        title,
        brand: brand || null,
        category: category || null,
        data
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ message: 'Tabela salva na galeria!', chart: created });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar/substituir uma tabela já salva
const updateSizeChart = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, brand, category, data } = req.body;

    const { data: updated, error } = await supabase
      .from('size_charts')
      .update({
        title,
        brand: brand || null,
        category: category || null,
        data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'Tabela não encontrada' });
    }

    res.json({ message: 'Tabela atualizada!', chart: updated[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar uma tabela salva
const deleteSizeChart = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('size_charts').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Tabela deletada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getPublicLogos,
  getSizeCharts, getSizeChartById, createSizeChart, updateSizeChart, deleteSizeChart
};
