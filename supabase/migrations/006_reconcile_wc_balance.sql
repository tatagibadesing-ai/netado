-- ────────────────────────────────────────────────────────────────────────────
-- Reconciliação do saldo do bolão da Copa (wc_balance)
-- ────────────────────────────────────────────────────────────────────────────
-- Um bug na resolução automática das apostas recreditava o prêmio mais de uma
-- vez (ver BetContext.tsx — update sem .select() não acusava 0 linhas afetadas),
-- inflando o wc_balance de quem tinha o app aberto em mais de uma aba/dispositivo.
--
-- O wc_balance é 100% reconstruível porque, ao contrário do saldo de cassino,
-- TODO movimento do bolão passa pela tabela netano_bets:
--   saldo_justo = 1000 (saldo inicial ao entrar no bolão)
--               - soma de TODAS as apostas do bolão (a aposta é debitada ao apostar)
--               + soma do potential_return das apostas GANHAS (prêmio creditado 1x)
--
-- Apostas 'pending' e 'lost' não somam prêmio — só o débito da aposta conta,
-- que é exatamente o comportamento correto.
-- ────────────────────────────────────────────────────────────────────────────


-- ── 1) PRÉVIA (dry-run) — não altera nada, só mostra quem está divergente ────
-- Rode isto primeiro para conferir os valores antes de aplicar.
with fair as (
  select
    p.id,
    p.username,
    p.wc_balance::numeric                                   as saldo_atual,
    round(
        1000.00
      - coalesce(sum(b.amount)           filter (where b.is_wc_bet), 0)
      + coalesce(sum(b.potential_return) filter (where b.is_wc_bet and b.status = 'won'), 0)
    , 2)                                                    as saldo_justo
  from public.netano_profiles p
  left join public.netano_bets b on b.user_id = p.id
  where p.wc_joined = true
  group by p.id, p.username, p.wc_balance
)
select
  id,
  username,
  saldo_atual,
  saldo_justo,
  (saldo_atual - saldo_justo) as diferenca   -- positivo = recebeu a mais (bug)
from fair
where saldo_atual is distinct from saldo_justo
order by diferenca desc;


-- ── 2) APLICAR — corrige o wc_balance de todos que entraram no bolão ─────────
-- Descomente e rode só depois de conferir a prévia acima.
--
-- with fair as (
--   select
--     p.id,
--     round(
--         1000.00
--       - coalesce(sum(b.amount)           filter (where b.is_wc_bet), 0)
--       + coalesce(sum(b.potential_return) filter (where b.is_wc_bet and b.status = 'won'), 0)
--     , 2) as saldo_justo
--   from public.netano_profiles p
--   left join public.netano_bets b on b.user_id = p.id
--   where p.wc_joined = true
--   group by p.id
-- )
-- update public.netano_profiles p
-- set wc_balance = fair.saldo_justo
-- from fair
-- where p.id = fair.id
--   and p.wc_balance is distinct from fair.saldo_justo;
