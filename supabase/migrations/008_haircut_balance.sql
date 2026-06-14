-- ────────────────────────────────────────────────────────────────────────────
-- Corte progressivo do SALDO NORMAL (netano_profiles.balance)
-- ────────────────────────────────────────────────────────────────────────────
-- Os bugs (crash com ganho garantido, duplo crédito etc.) inflaram o saldo de
-- alguns jogadores (100k, 70k...). Como o cassino NÃO registra cada rodada num
-- ledger, não dá pra reconstruir o saldo exato. Então aplicamos um "corte" por
-- faixa: quanto maior o saldo, maior a % retirada. Saldos pequenos (≤ 10k) ficam
-- intactos, pra não punir quem jogou normal.
--
-- Faixas (quanto SOBRA após o corte):
--   > 1.000.000  -> fica  3%  (tira 97%)
--   > 100.000    -> fica 10%  (tira 90%)
--   > 50.000     -> fica 20%  (tira 80%)
--   > 25.000     -> fica 40%  (tira 60%)
--   > 10.000     -> fica 70%  (tira 30%)
--   ≤ 10.000     -> intacto
--
-- ⚠️ Efeito degrau: como a % é fixa por faixa, alguém logo acima de um limite
-- pode terminar com menos que alguém logo abaixo. Para cortar cheaters isso é
-- aceitável; se quiser preservar a ordem exata do ranking, veja a Opção B no fim.
-- ⚠️ Rode só DEPOIS que as correções de código (crash, duplo crédito) estiverem
-- no ar, senão os saldos voltam a inflar.
-- ────────────────────────────────────────────────────────────────────────────


-- ── 1) PRÉVIA (dry-run) — não altera nada, mostra o corte de cada um ─────────
with adj as (
  select
    id,
    username,
    balance::numeric as saldo_atual,
    round(balance * (
      case
        when balance > 1000000 then 0.03
        when balance >  100000 then 0.10
        when balance >   50000 then 0.20
        when balance >   25000 then 0.40
        when balance >   10000 then 0.70
        else 1.00
      end
    ), 2) as saldo_novo
  from public.netano_profiles
)
select id, username, saldo_atual, saldo_novo,
       (saldo_atual - saldo_novo) as cortado
from adj
where saldo_atual is distinct from saldo_novo
order by saldo_atual desc;


-- ── 2) APLICAR — corta o saldo de quem está acima de 10k ─────────────────────
-- Descomente e rode só depois de conferir a prévia acima.
--
-- update public.netano_profiles
-- set balance = round(balance * (
--   case
--     when balance > 1000000 then 0.03
--     when balance >  100000 then 0.10
--     when balance >   50000 then 0.20
--     when balance >   25000 then 0.40
--     when balance >   10000 then 0.70
--     else 1.00
--   end
-- ), 2)
-- where balance > 10000;


-- ── Opção B (alternativa) — corte SUAVE que preserva a ordem do ranking ──────
-- Sem efeito degrau: comprime os saldos grandes de forma contínua e monotônica
-- (quem tinha mais continua com mais). 1.000.000 -> ~33k, 100k -> ~21k, 20k -> ~13k.
--
-- update public.netano_profiles
-- set balance = round(10000 + 5000 * ln(balance / 10000.0), 2)
-- where balance > 10000;
