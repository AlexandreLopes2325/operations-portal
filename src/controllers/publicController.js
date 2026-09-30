const supabase = require('../lib/supabase');
const { escapeHtml, safeUrl, safeColor, safeWidth } = require('../lib/html');

// Homepage do portal
const homepage = async (req, res) => {
  try {
    const { data: manuals } = await supabase
      .from('manuals')
      .select('id, title, description, slug')
      .eq('status', 'published')
      .eq('is_template', false)
      .order('title', { ascending: true });

    const { data: tools } = await supabase
      .from('tools')
      .select('id, title, description, icon, slug, html_url')
      .eq('is_active', true)
      .order('title', { ascending: true });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Operations Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #e9eaed; color: #18181b; min-height: 100vh; -webkit-font-smoothing: antialiased; }
    .header { background: #ffffff; border-bottom: 1px solid #d8dade; padding: 56px 32px 48px; text-align: center; }
    .brand { display: inline-flex; align-items: center; gap: 12px; }
    .mark { width: 40px; height: 40px; border-radius: 11px; background: #DC2626; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; flex-shrink: 0; }
    .header h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: #18181b; }
    .header p { color: #6b7280; margin-top: 10px; font-size: 16px; font-weight: 400; }
    .container { max-width: 860px; margin: 0 auto; padding: 48px 32px; }
    .section-title { font-size: 13px; font-weight: 600; margin-bottom: 16px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 8px; }
    .section-title span { font-size: 16px; }
    .list { background: #ffffff; border: 1px solid #d8dade; border-radius: 16px; overflow: hidden; margin-bottom: 56px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); }
    .row { display: flex; align-items: center; gap: 16px; padding: 18px 22px; text-decoration: none; color: inherit; border-bottom: 1px solid #f1f2f4; transition: background 0.15s ease; }
    .list a.row:last-child { border-bottom: none; }
    .row:hover { background: #fef2f2; }
    .row-icon { width: 44px; height: 44px; border-radius: 11px; background: #fef2f2; color: #DC2626; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .row-body { flex: 1; min-width: 0; }
    .row-body h3 { font-size: 16px; font-weight: 700; color: #18181b; margin-bottom: 2px; letter-spacing: -0.01em; }
    .row-body p { font-size: 13.5px; color: #6b7280; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-arrow { color: #d4d4d8; font-size: 18px; transition: all 0.15s ease; flex-shrink: 0; }
    .row:hover .row-arrow { color: #DC2626; transform: translateX(3px); }
    .empty { color: #9ca3af; text-align: center; padding: 40px 24px; font-size: 14px; background: #ffffff; border: 1px solid #d8dade; border-radius: 16px; margin-bottom: 56px; }
    .footer { text-align: center; padding: 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid #d8dade; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand"><span class="mark">O</span><h1>Operations Portal</h1></div>
    <p>Manuais operacionais e ferramentas para a equipe</p>
  </div>
  <div class="container">
    <h2 class="section-title"><span>📘</span> Manuais</h2>
    ${manuals && manuals.length > 0 ? `
    <div class="list">
      ${manuals.map(m => `
        <a href="/portal/guia/${encodeURIComponent(m.slug)}" class="row">
          <div class="row-icon">📘</div>
          <div class="row-body">
            <h3>${escapeHtml(m.title)}</h3>
            <p>${escapeHtml(m.description || 'Sem descrição')}</p>
          </div>
          <span class="row-arrow">→</span>
        </a>
      `).join('')}
    </div>
    ` : '<p class="empty">Nenhum manual publicado ainda</p>'}
    <h2 class="section-title"><span>🔧</span> Ferramentas</h2>
    ${tools && tools.length > 0 ? `
    <div class="list">
      ${tools.map(t => `
        <a href="/portal/ferramenta/${encodeURIComponent(t.slug)}" class="row">
          <div class="row-icon">${escapeHtml(t.icon)}</div>
          <div class="row-body">
            <h3>${escapeHtml(t.title)}</h3>
            <p>${escapeHtml(t.description || 'Sem descrição')}</p>
          </div>
          <span class="row-arrow">→</span>
        </a>
      `).join('')}
    </div>
    ` : '<p class="empty">Nenhuma ferramenta disponível ainda</p>'}
  </div>
  <div class="footer">OPERATIONS PORTAL &bull; 2026</div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('Erro na homepage:', err);
    res.status(500).send('Erro interno');
  }
};

// Página pública do manual
const publicManual = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: manual } = await supabase
      .from('manuals')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('is_template', false)
      .single();

    if (!manual) {
      return res.status(404).send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Não encontrado - Operations Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body style="background:#e9eaed;color:#18181b;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;">
    <p style="font-size:44px;margin-bottom:16px;">📘</p>
    <h1 style="font-size:22px;font-weight:800;color:#18181b;">Manual não encontrado</h1>
    <p style="color:#6b7280;margin-top:8px;font-size:15px;">Este manual não existe ou não foi publicado ainda.</p>
    <a href="/portal" style="color:#DC2626;margin-top:24px;display:inline-block;font-weight:600;font-size:14px;text-decoration:none;">← Voltar pro portal</a>
  </div>
</body>
</html>`);
    }

    // Se tem HTML customizado, usa ele SEM escapar - intencional.
    // custom_html só pode ser gravado por admin e admin_master (checado no banco em
    // manualController.updateManual); é o recurso "HTML customizado" do editor.
    // Quem tem essas roles consegue publicar qualquer HTML/JS no portal público.
    if (manual.custom_html) {
      return res.send(manual.custom_html);
    }

    // Senão, renderiza pelos blocos
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('manual_id', manual.id)
      .order('sort_order', { ascending: true });

    const renderSection = (section) => {
      const color = safeColor(section.color);
      const c = section.content || {};
      const text = escapeHtml(c.text || '');
      switch (section.type) {
        case 'title':
          return `<h1 style="font-size:30px;font-weight:800;margin:44px 0 16px;letter-spacing:-0.01em;color:${color};">${text}</h1>`;
        case 'subtitle':
          const stag = c.level === 'h3' ? 'h3' : 'h2';
          const ssize = c.level === 'h3' ? '18px' : '21px';
          return `<${stag} style="font-size:${ssize};font-weight:700;margin:32px 0 12px;color:${color};">${text}</${stag}>`;
        case 'text':
          return `<p style="font-size:16px;line-height:1.75;color:#3f3f46;margin:14px 0;white-space:pre-wrap;">${text}</p>`;
        case 'alert':
          return `<div style="padding:16px 20px;border-radius:10px;border-left:4px solid ${color};background:#e9eaed;margin:22px 0;display:flex;align-items:flex-start;gap:14px;">
            <span style="font-size:18px;flex-shrink:0;">⚠️</span>
            <p style="font-size:15px;color:#3f3f46;margin:0;line-height:1.7;">${text}</p>
          </div>`;
        case 'step':
          return `<div style="display:flex;align-items:flex-start;gap:18px;margin:16px 0;padding:20px;background:#e9eaed;border:1px solid #d8dade;border-radius:12px;">
            <div style="width:36px;height:36px;border-radius:10px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">
              ${escapeHtml(c.number || section.sort_order)}
            </div>
            <p style="font-size:15px;color:#3f3f46;line-height:1.7;padding-top:6px;white-space:pre-wrap;">${text}</p>
          </div>`;
        case 'checklist':
          return `<div style="margin:20px 0;">
            ${(Array.isArray(c.items) ? c.items : []).map(item => `
              <div style="display:flex;align-items:flex-start;gap:14px;margin:8px 0;padding:14px 18px;background:#e9eaed;border:1px solid #d8dade;border-radius:10px;">
                <div style="width:18px;height:18px;border-radius:5px;border:2px solid ${color};flex-shrink:0;margin-top:2px;"></div>
                <span style="font-size:15px;color:#3f3f46;line-height:1.6;">${escapeHtml(item)}</span>
              </div>
            `).join('')}
          </div>`;
        case 'image':
          return `<div style="margin:28px 0;text-align:center;">
            ${safeUrl(c.url) ? `
              <img src="${safeUrl(c.url)}" alt="${escapeHtml(c.alt || '')}" style="width:${safeWidth(c.width)};max-width:100%;border-radius:12px;border:1px solid #d8dade;box-shadow:0 2px 12px rgba(15,23,42,0.06);" />
              ${c.caption ? `<p style="font-size:13px;color:#9ca3af;margin-top:12px;">${escapeHtml(c.caption)}</p>` : ''}
            ` : ''}
          </div>`;
        case 'table':
          return `<div style="margin:24px 0;overflow-x:auto;border-radius:12px;border:1px solid #d8dade;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  ${(Array.isArray(c.headers) ? c.headers : []).map(h => `
                    <th style="text-align:left;font-size:12px;font-weight:700;padding:14px 16px;color:#52525b;border-bottom:2px solid ${color};background:#e9eaed;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(h)}</th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${(Array.isArray(c.rows) ? c.rows : []).map((row, i) => `
                  <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fafafb'};">
                    ${(Array.isArray(row) ? row : []).map(cell => `<td style="font-size:14px;padding:13px 16px;color:#3f3f46;border-bottom:1px solid #f1f2f4;">${escapeHtml(cell || '-')}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;
        case 'divider':
          const dstyle = ['solid', 'dashed', 'dotted'].includes(c.style) ? c.style : 'solid';
          return `<hr style="border:none;border-top:2px ${dstyle} ${color};margin:40px 0;opacity:0.3;" />`;
        default:
          return '';
      }
    };

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(manual.title)} - Operations Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #e9eaed; color: #27272a; min-height: 100vh; font-size: 16px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
    .header { background: #ffffff; border-bottom: 1px solid #d8dade; padding: 16px 32px; display: flex; align-items: center; position: sticky; top: 0; z-index: 100; }
    .header a { color: #6b7280; text-decoration: none; font-size: 14px; font-weight: 500; margin-right: 16px; }
    .header a:hover { color: #DC2626; }
    .mark-sm { width: 26px; height: 26px; border-radius: 8px; background: #DC2626; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; margin-right: 10px; vertical-align: middle; }
    .header h1 { color: #18181b; font-size: 15px; font-weight: 600; }
    .header .badge { background: #ecfdf5; color: #16a34a; font-size: 10px; padding: 3px 8px; border-radius: 6px; margin-left: 10px; font-weight: 600; }
    .container { max-width: 820px; margin: 32px auto 48px; background: #ffffff; padding: 48px; border-radius: 16px; border: 1px solid #d8dade; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); }
    .meta { color: #6b7280; font-size: 16px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid #f1f2f4; }
    .footer { text-align: center; padding: 32px; color: #9ca3af; font-size: 11px; letter-spacing: 0.05em; }
    html { scroll-behavior: smooth; }
    @media (max-width: 640px) { .container { padding: 28px 20px; margin: 16px; border-radius: 12px; } .header { padding: 12px 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <a href="/portal">← Portal</a>
    <h1><span class="mark-sm">O</span>${escapeHtml(manual.title)}<span class="badge">Publicado</span></h1>
  </div>
  <div class="container">
    ${manual.description ? `<p class="meta">${escapeHtml(manual.description)}</p>` : ''}
    ${sections ? sections.map(s => renderSection(s)).join('') : '<p style="color:#9ca3af;text-align:center;padding:64px;">Sem conteúdo</p>'}
  </div>
  <div class="footer">OPERATIONS PORTAL &bull; 2026</div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('Erro ao renderizar manual:', err);
    res.status(500).send('Erro interno');
  }
};

// Página pública da ferramenta
const publicTool = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: tool } = await supabase
      .from('tools')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!tool || !tool.html_url) {
      return res.status(404).send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Não encontrada - Operations Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body style="background:#e9eaed;color:#18181b;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;">
    <p style="font-size:44px;margin-bottom:16px;">🔧</p>
    <h1 style="font-size:22px;font-weight:800;color:#18181b;">Ferramenta não encontrada</h1>
    <p style="color:#6b7280;margin-top:8px;font-size:15px;">Esta ferramenta não existe ou está desativada.</p>
    <a href="/portal" style="color:#DC2626;margin-top:24px;display:inline-block;font-weight:600;font-size:14px;text-decoration:none;">← Voltar pro portal</a>
  </div>
</body>
</html>`);
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(tool.title)} - Operations Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #e9eaed; min-height: 100vh; display: flex; flex-direction: column; }
    .header { background: #ffffff; border-bottom: 1px solid #d8dade; padding: 14px 32px; display: flex; align-items: center; gap: 14px; }
    .header a { color: #6b7280; text-decoration: none; font-size: 14px; font-weight: 500; }
    .header a:hover { color: #DC2626; }
    .header h1 { color: #18181b; font-size: 15px; font-weight: 600; }
    .header .icon { font-size: 20px; }
    iframe { flex: 1; border: none; width: 100%; background: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/portal">← Portal</a>
    <span class="icon">${escapeHtml(tool.icon)}</span>
    <h1>${escapeHtml(tool.title)}</h1>
  </div>
  <iframe src="/portal/ferramenta/${encodeURIComponent(tool.slug)}/embed"></iframe>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('Erro ao renderizar ferramenta:', err);
    res.status(500).send('Erro interno');
  }
};

// Busca o HTML da ferramenta no Storage e serve com Content-Type correto.
// O Supabase Storage força text/plain + CSP sandbox em objetos públicos por segurança,
// então não dá pra apontar o iframe direto pra URL do Storage - precisa passar por aqui.
const toolEmbed = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: tool } = await supabase
      .from('tools')
      .select('html_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!tool || !tool.html_url) {
      return res.status(404).send('Ferramenta não encontrada');
    }

    const storageResponse = await fetch(tool.html_url);

    if (!storageResponse.ok) {
      return res.status(502).send('Erro ao carregar o arquivo da ferramenta');
    }

    const html = await storageResponse.text();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Erro ao servir ferramenta embed:', err);
    res.status(500).send('Erro interno');
  }
};

module.exports = { homepage, publicManual, publicTool, toolEmbed };
