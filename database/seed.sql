-- =============================================================================
-- Operations Portal — dados de DEMONSTRAÇÃO (100% fictícios)
-- Loja fictícia: "Loja Demo". Nenhum dado real de empresa, cliente ou pedido.
--
-- Todos os usuários usam a senha de demonstração:  Demo@1234
-- (hash bcrypt, custo 10). Troque/remova esses usuários em qualquer ambiente real.
--
-- Rodar depois do schema:  psql "$DATABASE_URL" -f database/seed.sql
-- =============================================================================

-- Usuários (um por nível de acesso) -------------------------------------------
insert into users (id, name, email, password, role) values
  ('00000000-0000-0000-0000-000000000001', 'Ana Master',  'master@example.com', '$2b$10$etxNDTE9NWCBsl2exm2dDOaoSxYUYphPkyZjw3c/3I.wRHxRQ2r0G', 'admin_master'),
  ('00000000-0000-0000-0000-000000000002', 'Bruno Admin', 'admin@example.com',  '$2b$10$etxNDTE9NWCBsl2exm2dDOaoSxYUYphPkyZjw3c/3I.wRHxRQ2r0G', 'admin'),
  ('00000000-0000-0000-0000-000000000003', 'Carla Editora','editor@example.com', '$2b$10$etxNDTE9NWCBsl2exm2dDOaoSxYUYphPkyZjw3c/3I.wRHxRQ2r0G', 'editor'),
  ('00000000-0000-0000-0000-000000000004', 'Diego Leitor', 'viewer@example.com', '$2b$10$etxNDTE9NWCBsl2exm2dDOaoSxYUYphPkyZjw3c/3I.wRHxRQ2r0G', 'viewer');

-- Editor com permissão extra de ver devoluções mas sem criar (exemplo de override granular)
update users set permissions = '{
  "manuals":    {"view": true,  "create": true,  "edit": true,  "delete": false},
  "templates":  {"view": true,  "create": true,  "edit": false, "delete": false},
  "tools":      {"view": true,  "create": false, "edit": false, "delete": false},
  "logos":      {"view": true,  "create": false, "edit": false, "delete": false},
  "users":      {"view": false, "create": false, "edit": false, "delete": false},
  "audit_logs": {"view": false, "create": false, "edit": false, "delete": false},
  "returns":    {"view": true,  "create": false, "edit": false, "delete": false}
}'::jsonb
where id = '00000000-0000-0000-0000-000000000003';

-- Manuais ---------------------------------------------------------------------
insert into manuals (id, title, description, slug, status, is_template, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Conferência de Pedidos', 'Passo a passo para conferir pedidos antes do envio.', 'conferencia-de-pedidos', 'published', false, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Embalagem Padrão',       'Materiais e dobras para cada tipo de produto.',        'embalagem-padrao',       'draft',     false, '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000003', '[Template] Procedimento Simples', 'Estrutura base: objetivo, passos e checklist.', 'template-procedimento-simples', 'draft', true, '00000000-0000-0000-0000-000000000001');

insert into sections (manual_id, type, content, color, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'title',     '{"text": "Conferência de Pedidos"}', '#18181b', 1),
  ('10000000-0000-0000-0000-000000000001', 'text',      '{"text": "Todo pedido passa por conferência antes de ser lacrado."}', '#18181b', 2),
  ('10000000-0000-0000-0000-000000000001', 'step',      '{"number": 1, "text": "Imprima a etiqueta e confira o número do pedido."}', '#2563eb', 3),
  ('10000000-0000-0000-0000-000000000001', 'step',      '{"number": 2, "text": "Confira SKU, tamanho e cor de cada item."}', '#2563eb', 4),
  ('10000000-0000-0000-0000-000000000001', 'alert',     '{"text": "Divergência? Não lacre a caixa: avise o supervisor."}', '#dc2626', 5),
  ('10000000-0000-0000-0000-000000000001', 'checklist', '{"items": ["Etiqueta conferida", "Itens conferidos", "Nota fiscal na caixa"]}', '#16a34a', 6),
  ('10000000-0000-0000-0000-000000000001', 'table',     '{"headers": ["Tipo de caixa", "Uso"], "rows": [["P", "1 peça"], ["M", "2 a 3 peças"], ["G", "4+ peças"]]}', '#2563eb', 7),
  ('10000000-0000-0000-0000-000000000002', 'title',     '{"text": "Embalagem Padrão"}', '#18181b', 1),
  ('10000000-0000-0000-0000-000000000002', 'text',      '{"text": "Rascunho em construção."}', '#18181b', 2),
  ('10000000-0000-0000-0000-000000000003', 'title',     '{"text": "Objetivo"}', '#18181b', 1),
  ('10000000-0000-0000-0000-000000000003', 'step',      '{"number": 1, "text": "Descreva o primeiro passo."}', '#2563eb', 2),
  ('10000000-0000-0000-0000-000000000003', 'checklist', '{"items": ["Item 1", "Item 2"]}', '#16a34a', 3);

-- Ferramentas (sem HTML no Storage: aparecem no painel, mas não abrem no portal) --
insert into tools (title, description, icon, slug, html_url, is_active, created_by) values
  ('Calculadora de Frete (demo)', 'Exemplo de ferramenta HTML embarcada.', '🧮', 'calculadora-frete-demo', null, true, '00000000-0000-0000-0000-000000000001');

-- Canais e motivos de devolução -----------------------------------------------
insert into return_channels (key, label, sort_order, requires_return_id) values
  ('loja-propria',     'Loja Própria',     1, false),
  ('marketplace-alfa', 'Marketplace Alfa', 2, false),
  ('marketplace-beta', 'Marketplace Beta', 3, true);  -- exibe o campo "ID da devolução"

insert into return_reasons (channel, label, sort_order) values
  ('loja-propria',     'Tamanho não serviu',       1),
  ('loja-propria',     'Desistência da compra',    2),
  ('marketplace-alfa', 'Produto com defeito',      1),
  ('marketplace-alfa', 'Produto diferente do anúncio', 2),
  ('marketplace-beta', 'Não recebido no prazo',    1),
  ('marketplace-beta', 'Tamanho não serviu',       2);

-- Devoluções (pedidos inventados) ---------------------------------------------
insert into returns (order_number, channel, channel_return_id, product, reason, condition,
                     request_date, received_date, has_complaint, quarantine_start, quarantine_days,
                     complaint_details, product_value, has_penalty, penalty_value, refunded,
                     status, notes, created_by) values
  ('DEMO-1001', 'loja-propria', null, 'Camiseta Básica M Azul', 'Tamanho não serviu', 'Novo, com etiqueta',
   current_date - 10, current_date - 5, false, null, null, null, 59.90, false, null, true,
   'finalizado', 'Troca por tamanho G enviada.', '00000000-0000-0000-0000-000000000003'),
  ('DEMO-1002', 'marketplace-alfa', null, 'Moletom Canguru P Cinza', 'Produto com defeito', 'Costura aberta',
   current_date - 6, current_date - 2, true, current_date - 2, 7, 'Cliente abriu reclamação no canal.', 149.90, false, null, false,
   'quarentena', null, '00000000-0000-0000-0000-000000000003'),
  ('DEMO-1003', 'marketplace-beta', 'RB-000123', 'Boné Aba Curva Preto', 'Não recebido no prazo', null,
   current_date - 3, null, false, null, null, null, 39.90, true, 12.50, false,
   'aguardando_retorno', 'Aguardando rastreio da transportadora.', '00000000-0000-0000-0000-000000000002'),
  ('DEMO-1004', 'marketplace-alfa', null, 'Calça Jogger 40 Verde', 'Produto diferente do anúncio', 'Usado, sem etiqueta',
   current_date - 20, current_date - 14, true, current_date - 14, 10, 'Cor divergente segundo o cliente.', 129.90, true, 129.90, true,
   'aguardando_canal', 'Contestação enviada ao canal.', '00000000-0000-0000-0000-000000000002');

-- Auditoria de exemplo (IPs de documentação, RFC 5737) ------------------------
insert into audit_logs (user_id, action, details, ip_address) values
  ('00000000-0000-0000-0000-000000000001', 'USER_LOGIN',    '{"email": "master@example.com"}', '192.0.2.10'),
  ('00000000-0000-0000-0000-000000000003', 'MANUAL_CREATE', '{"title": "Embalagem Padrão", "slug": "embalagem-padrao"}', '192.0.2.23'),
  ('00000000-0000-0000-0000-000000000002', 'RETURN_CREATE', '{"order_number": "DEMO-1003", "channel": "marketplace-beta"}', '198.51.100.7');
