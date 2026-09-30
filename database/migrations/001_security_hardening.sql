-- =============================================================================
-- Migration 001 — security hardening
-- Para bancos criados com a versão anterior do schema.sql.
-- Rode a PARTE A antes de publicar o código novo e a PARTE B depois.
-- =============================================================================

-- ---------------------------------------------------------------- PARTE A ----
-- Compatível com o código antigo e com o novo (nada é removido aqui).
begin;

-- Recuperação de senha: hash do código + contador de tentativas
alter table password_resets add column if not exists token_hash text;
alter table password_resets add column if not exists attempts integer not null default 0;
alter table password_resets alter column token drop not null;

-- Canais: marketplace fornece ID próprio de devolução?
alter table return_channels add column if not exists requires_return_id boolean not null default false;
-- Marque aqui os canais que devem exibir o campo "ID da devolução", ex.:
-- update return_channels set requires_return_id = true where key in ('seu-canal');

commit;

-- ---------------------------------------------------------------- PARTE B ----
-- Rode SÓ depois que o código novo estiver no ar.
begin;

-- Códigos antigos estavam em texto puro: descarta todos (expiravam em 1h de qualquer forma)
delete from password_resets where token_hash is null;
alter table password_resets drop column if exists token;
alter table password_resets alter column token_hash set not null;
alter table password_resets add constraint password_resets_token_hash_format
  check (token_hash ~ '^[a-f0-9]{64}$');
alter table password_resets add constraint password_resets_attempts_nonneg
  check (attempts >= 0);

commit;
