// Helpers para montar HTML no servidor sem abrir brecha de XSS.
// Todo valor vindo do banco que for interpolado em HTML deve passar por aqui.

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

// Escapa texto para uso em conteúdo de tag ou valor de atributo entre aspas
const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch]);
};

// Só aceita URLs absolutas http(s); qualquer outra coisa (javascript:, data:, etc.) vira ''
const safeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : '';
};

// Cores dos blocos vão parar em atributos style: só hex (#rgb, #rrggbb, #rrggbbaa)
const safeColor = (value, fallback = '#52525b') => {
  return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : fallback;
};

// Largura de imagem: só porcentagem ou px (ex: 50%, 320px)
const safeWidth = (value, fallback = '100%') => {
  return typeof value === 'string' && /^\d{1,4}(%|px)$/.test(value.trim()) ? value.trim() : fallback;
};

module.exports = { escapeHtml, safeUrl, safeColor, safeWidth };
