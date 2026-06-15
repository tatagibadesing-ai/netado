-- ────────────────────────────────────────────────────────────────────────────
-- Tabela de logs/associação de IPs acessados por cada perfil (anti-fraude)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.netano_profile_ips (
  profile_id uuid not null references public.netano_profiles(id) on delete cascade,
  ip text not null,
  first_accessed_at timestamp with time zone default now(),
  last_accessed_at timestamp with time zone default now(),
  primary key (profile_id, ip)
);

-- Índice para lookup rápido por IP
create index if not exists netano_profile_ips_ip_idx
  on public.netano_profile_ips (ip);

-- Habilitar RLS
alter table public.netano_profile_ips enable row level security;

-- Política RLS: Usuários autenticados podem ver apenas os seus próprios IPs associados
create policy "users can read own profile_ips"
  on public.netano_profile_ips for select
  using (auth.uid() = profile_id);

-- Migrar dados históricos da coluna `signup_ip` na tabela `netano_profiles`
insert into public.netano_profile_ips (profile_id, ip)
select id, signup_ip
from public.netano_profiles
where signup_ip is not null
on conflict (profile_id, ip) do nothing;
