-- ────────────────────────────────────────────────────────────────────────────
-- RESET do bolão da Copa
-- ────────────────────────────────────────────────────────────────────────────
-- O bug de duplo crédito (ver BetContext.tsx) deixou os saldos do bolão
-- inconsistentes — alguns inflados, outros negativos por terem apostado o
-- "dinheiro fantasma" gerado pelo bug. Em vez de reconciliar caso a caso,
-- optou-se por zerar a competição: todo mundo volta pra R$ 1000 e recomeça.
--
-- ⚠️ PRÉ-REQUISITO: o fix no código (o .select() em BetContext.tsx) precisa já
-- estar no ar ANTES de rodar isto, senão o bug volta a inflar os saldos.
-- ⚠️ Peça pra todo mundo dar refresh / relogar depois, pra limpar o estado em
-- memória das abas abertas.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Apaga todas as apostas do bolão (limpa o histórico da competição).
--    Inclui apostas pendentes, ganhas, perdidas e palpites de campeão (is_wc_bet = true).
delete from public.netano_bets
where is_wc_bet = true;

-- 2) Devolve todos os participantes do bolão para R$ 1000.
update public.netano_profiles
set wc_balance = 1000.00
where wc_joined = true;
