-- ────────────────────────────────────────────────────────────────────────────
-- Remoção/Desativação de limites diários do cassino
-- ────────────────────────────────────────────────────────────────────────────

-- Alterar a tabela netano_profiles para que casino_limit_bypass seja true por padrão
alter table public.netano_profiles 
  alter column casino_limit_bypass set default true;

-- Atualizar todos os perfis existentes para ter bypass ativado
update public.netano_profiles 
  set casino_limit_bypass = true;

-- Recriar as funções do cassino para registrar o uso mas nunca retornar -1 (bloqueado)
create or replace function casino_spend_bet_credits(
  uid           uuid,
  credits       integer,
  max_credits   integer
)
returns integer
language plpgsql
security definer
as $$
declare
  current_credits integer;
begin
  insert into casino_daily_usage (user_id, usage_date, bet_credits, time_secs)
  values (uid, current_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  update casino_daily_usage
  set bet_credits = bet_credits + credits
  where user_id = uid and usage_date = current_date;

  select bet_credits into current_credits
  from casino_daily_usage
  where user_id = uid and usage_date = current_date;

  return current_credits;
end;
$$;

create or replace function casino_spend_time(
  uid       uuid,
  secs      integer,
  max_secs  integer
)
returns integer
language plpgsql
security definer
as $$
declare
  current_secs integer;
begin
  insert into casino_daily_usage (user_id, usage_date, bet_credits, time_secs)
  values (uid, current_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  update casino_daily_usage
  set time_secs = time_secs + secs
  where user_id = uid and usage_date = current_date;

  select time_secs into current_secs
  from casino_daily_usage
  where user_id = uid and usage_date = current_date;

  return current_secs;
end;
$$;
