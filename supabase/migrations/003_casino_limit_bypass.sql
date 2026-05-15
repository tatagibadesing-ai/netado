-- Adiciona coluna de bypass na tabela de perfis
alter table netano_profiles
  add column if not exists casino_limit_bypass boolean not null default false;

-- Atualiza a função de créditos para ignorar o limite se bypass=true
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
  is_bypass boolean;
begin
  select casino_limit_bypass into is_bypass
  from netano_profiles
  where id = uid;

  -- Usuário com bypass: registra o uso mas nunca bloqueia
  if is_bypass then
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
  end if;

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

-- Atualiza a função de tempo para ignorar o limite se bypass=true
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
  is_bypass boolean;
begin
  select casino_limit_bypass into is_bypass
  from netano_profiles
  where id = uid;

  -- Usuário com bypass: registra mas nunca bloqueia
  if is_bypass then
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
  end if;

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

-- Para ativar bypass em um usuário específico, rode:
-- update netano_profiles set casino_limit_bypass = true where id = '<uuid-do-usuario>';

-- Para desativar:
-- update netano_profiles set casino_limit_bypass = false where id = '<uuid-do-usuario>';
