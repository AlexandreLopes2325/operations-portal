const supabase = require('../lib/supabase');
const { logAction } = require('./auditController');

// Listar todos os logos
const getLogos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('logos')
      .select('*')
      .order('brand_name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Upload de logo
const uploadLogo = async (req, res) => {
  try {
    const { brand_name, svg_data, png_data } = req.body;

    let svg_url = null;
    let png_url = null;

    const slug = brand_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Upload SVG
    if (svg_data) {
      const svgBuffer = Buffer.from(svg_data, 'base64');
      const { error: svgError } = await supabase.storage
        .from('logos')
        .upload(`${slug}.svg`, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (svgError) {
        return res.status(500).json({ error: 'Erro ao fazer upload do SVG: ' + svgError.message });
      }

      const { data: svgPublic } = supabase.storage
        .from('logos')
        .getPublicUrl(`${slug}.svg`);

      svg_url = svgPublic.publicUrl;
    }

    // Upload PNG
    if (png_data) {
      const pngBuffer = Buffer.from(png_data, 'base64');
      const { error: pngError } = await supabase.storage
        .from('logos')
        .upload(`${slug}.png`, pngBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (pngError) {
        return res.status(500).json({ error: 'Erro ao fazer upload do PNG: ' + pngError.message });
      }

      const { data: pngPublic } = supabase.storage
        .from('logos')
        .getPublicUrl(`${slug}.png`);

      png_url = pngPublic.publicUrl;
    }

    // Salvar no banco
    const { data, error } = await supabase
      .from('logos')
      .insert({
        brand_name,
        svg_url,
        png_url,
        uploaded_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction(req.user.id, 'LOGO_UPLOAD', { brand_name }, req.ip);

    res.status(201).json({
      message: 'Logo enviado com sucesso!',
      logo: data
    });
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar logo
const deleteLogo = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: logo } = await supabase
      .from('logos')
      .select('*')
      .eq('id', id)
      .single();

    if (!logo) {
      return res.status(404).json({ error: 'Logo não encontrado' });
    }

    const slug = logo.brand_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Deletar arquivos do storage
    await supabase.storage
      .from('logos')
      .remove([`${slug}.svg`, `${slug}.png`]);

    // Deletar do banco
    await supabase
      .from('logos')
      .delete()
      .eq('id', id);

    await logAction(req.user.id, 'LOGO_DELETE', { brand_name: logo.brand_name }, req.ip);

    res.json({ message: 'Logo deletado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Upload de imagem genérica (pro editor)
const uploadImage = async (req, res) => {
  try {
    const { image_data, filename } = req.body;

    if (!image_data) {
      return res.status(400).json({ error: 'Envie uma imagem' });
    }

    const slug = filename
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const extension = filename.split('.').pop().toLowerCase();
    const fullName = `${slug}-${Date.now()}.${extension}`;

    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    };

    const buffer = Buffer.from(image_data, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fullName, buffer, {
        contentType: mimeTypes[extension] || 'image/png',
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Erro no upload: ' + uploadError.message });
    }

    const { data: publicUrl } = supabase.storage
      .from('images')
      .getPublicUrl(fullName);

    res.json({ url: publicUrl.publicUrl });
  } catch (err) {
    console.error('Erro no upload de imagem:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getLogos, uploadLogo, deleteLogo, uploadImage };