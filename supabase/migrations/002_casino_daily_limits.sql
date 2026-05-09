-- Tabela de uso diário do cassino por usuário
create table if not exists casino_daily_usage (
  id          bigserial primary key,
  user_id     uuid not null references netano_profiles(id) on delete cascade,
  usage_date  date not null default current_date,
  bet_credits integer not null default 0,   -- créditos de aposta gastos no dia
  time_secs   integer not null default 0,   -- segundos de sessão gastos no dia
  unique (user_id, usage_date)
);

-- Índice para lookup rápido
create index if not exists casino_daily_usage_user_date on casino_daily_usage(user_id, usage_date);

-- RLS: cada usuário só vê e edita seus próprios dados
alter table casino_daily_usage enable row level security;

create policy "users can read own usage"
  on casino_daily_usage for select
  using (auth.uid() = user_id);

create policy "users can insert own usage"
  on casino_daily_usage for insert
  with check (auth.uid() = user_id);

create policy "users can update own usage"
  on casino_daily_usage for update
  using (auth.uid() = user_id);

-- Função atômica: gasta N créditos de aposta.
-- Retorna o novo total de créditos gastos, ou -1 se o limite foi atingido.
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

  select bet_credits into current_credits
  from casino_daily_usage
  where user_id = uid and usage_date = current_date
  for update;

  if current_credits >= max_credits then
    return -1;
  end if;

  update casino_daily_usage
  set bet_credits = bet_credits + credits
  where user_id = uid and usage_date = current_date;

  return current_credits + credits;
end;
$$;

-- Função para registrar tempo de sessão (em segundos).
-- Retorna total de segundos no dia, ou -1 se já passou de 1200s (20 min).
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

  select time_secs into current_secs
  from casino_daily_usage
  where user_id = uid and usage_date = current_date
  for update;

  if current_secs >= max_secs then
    return -1;
  end if;

  update casino_daily_usage
  set time_secs = time_secs + secs
  where user_id = uid and usage_date = current_date;

  return current_secs + secs;
end;
$$;

-- Função de leitura do uso atual do dia (sem lock)
create or replace function casino_get_usage(uid uuid)
returns table(bet_credits integer, time_secs integer)
language plpgsql
security definer
as $$
begin
  return query
  select coalesce(u.bet_credits, 0), coalesce(u.time_secs, 0)
  from casino_daily_usage u
  where u.user_id = uid and u.usage_date = current_date;

  if not found then
    return query select 0::integer, 0::integer;
  end if;
end;
$$;
