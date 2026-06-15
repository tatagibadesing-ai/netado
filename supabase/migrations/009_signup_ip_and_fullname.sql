-- ────────────────────────────────────────────────────────────────────────────
-- Campos privados de cadastro (anti-fraude / anti-conta-múltipla)
-- ────────────────────────────────────────────────────────────────────────────
-- full_name : nome real informado na criação da conta.
-- signup_ip : IP de onde a conta foi criada (usado para impedir 2ª conta no
--             mesmo IP/rede).
--
-- Esses dois campos são de uso EXCLUSIVO do dono no painel do Supabase: a API de
-- registro (/api/register) nunca os devolve ao cliente e o app nunca os exibe.
-- ⚠️ Rode esta migration ANTES de publicar a nova tela de login, senão o insert
-- da conta falha por coluna inexistente.
-- ────────────────────────────────────────────────────────────────────────────
alter table public.netano_profiles
  add column if not exists full_name text,
  add column if not exists signup_ip text;

-- Índice para a checagem "já existe conta neste IP?" ser rápida.
create index if not exists netano_profiles_signup_ip_idx
  on public.netano_profiles (signup_ip);
