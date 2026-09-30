-- =============================================================================
-- Operations Portal — schema do banco (PostgreSQL / Supabase)
-- Somente ESTRUTURA. Deduzido das queries em src/controllers/*.js.
-- Rodar em um banco vazio: psql "$DATABASE_URL" -f database/schema.sql
-- =============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- users: contas do painel, com role (4 níveis) e permissões granulares opcionais
-- -----------------------------------------------------------------------------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  password    text not null,                       -- hash bcrypt, nunca texto puro
  role        text not null default 'viewer'
              check (role in ('viewer', 'editor', 'admin', 'admin_master')),
  permissions jsonb,                               -- null = usa o padrão da role
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- password_resets: códigos de recuperação (só o hash sha256; 15 min; uso único; 5 tentativas)
-- -----------------------------------------------------------------------------
create table if not exists password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  attempts   integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_password_resets_user on password_resets (user_id, used, created_at desc);

-- -----------------------------------------------------------------------------
-- audit_logs: trilha de auditoria de ações (quem, o quê, detalhes, IP)
-- -----------------------------------------------------------------------------
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  action     text not null,
  details    jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on audit_logs (created_at desc);
create index if not exists idx_audit_logs_user on audit_logs (user_id);

-- -----------------------------------------------------------------------------
-- manuals: manuais operacionais e templates (is_template = true)
-- -----------------------------------------------------------------------------
create table if not exists manuals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  status      text not null default 'draft' check (status in ('draft', 'published')),
  is_template boolean not null default false,
  custom_html text,                                -- se preenchido, substitui os blocos
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_manuals_template_status on manuals (is_template, status);

-- -----------------------------------------------------------------------------
-- sections: blocos de conteúdo de um manual (editor em blocos)
-- -----------------------------------------------------------------------------
create table if not exists sections (
  id         uuid primary key default gen_random_uuid(),
  manual_id  uuid not null references manuals(id) on delete cascade,
  type       text not null check (type in (
               'title', 'subtitle', 'text', 'alert', 'table',
               'image', 'step', 'checklist', 'divider')),
  content    jsonb not null default '{}'::jsonb,
  color      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sections_manual_order on sections (manual_id, sort_order);

-- -----------------------------------------------------------------------------
-- logos: biblioteca de logos (arquivos no Storage, bucket "logos")
-- -----------------------------------------------------------------------------
create table if not exists logos (
  id          uuid primary key default gen_random_uuid(),
  brand_name  text not null,
  svg_url     text,
  png_url     text,
  uploaded_by uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- tools: ferramentas HTML embarcadas no portal público (bucket "tools")
-- -----------------------------------------------------------------------------
create table if not exists tools (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  icon        text not null default '🔧',
  slug        text not null unique,
  html_url    text,
  is_active   boolean not null default true,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- size_charts: tabelas de medidas salvas pela ferramenta embarcada
-- -----------------------------------------------------------------------------
create table if not exists size_charts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  brand      text,
  category   text,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_size_charts_updated on size_charts (updated_at desc);

-- -----------------------------------------------------------------------------
-- return_channels: canais de venda / marketplaces cadastráveis
-- -----------------------------------------------------------------------------
create table if not exists return_channels (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,                 -- slug gerado a partir do label
  label      text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  requires_return_id boolean not null default false, -- marketplace fornece ID próprio de devolução
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- return_reasons: motivos de devolução configuráveis por canal
-- -----------------------------------------------------------------------------
create table if not exists return_reasons (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null references return_channels(key) on update cascade,
  label      text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_return_reasons_channel on return_reasons (channel, sort_order);

-- -----------------------------------------------------------------------------
-- returns: registro de devoluções, com quarentena, multa e resolução
-- -----------------------------------------------------------------------------
create table if not exists returns (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null,
  channel           text not null references return_channels(key) on update cascade,
  channel_return_id text,                          -- ID de devolução do próprio marketplace
  product           text not null,
  reason            text not null,                 -- label do motivo (texto livre, histórico)
  condition         text,
  request_date      date,
  received_date     date,
  has_complaint     boolean not null default false,
  quarantine_start  date,
  quarantine_days   integer check (quarantine_days is null or quarantine_days >= 0),
  complaint_details text,
  product_value     numeric(12, 2) not null default 0,
  has_penalty       boolean not null default false,
  penalty_value     numeric(12, 2),
  refunded          boolean not null default false,
  status            text not null default 'aguardando_retorno'
                    check (status in ('aguardando_retorno', 'quarentena', 'aguardando_canal', 'finalizado')),
  notes             text,
  resolution_notes  text,
  marketplace_favor boolean,
  seller_reimbursed boolean,
  resolved_at       timestamptz,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_returns_created on returns (created_at desc);
create index if not exists idx_returns_request_date on returns (request_date);
create index if not exists idx_returns_channel_status on returns (channel, status);
