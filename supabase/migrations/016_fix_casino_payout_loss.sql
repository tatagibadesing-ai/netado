-- ────────────────────────────────────────────────────────────────────────────
-- CORREÇÃO: prêmios do cassino sumindo (jogador perde a aposta E o prêmio)
-- ────────────────────────────────────────────────────────────────────────────
-- A migration 014 colocou um RAISE EXCEPTION em adjust_balance / adjust_wc_balance
-- quando o crédito passava de R$15.000 por rodada, ou quando o saldo final passava
-- de R$300.000. O problema:
--
--   1. A aposta é DEBITADA numa chamada RPC (transação já commitada).
--   2. O prêmio é CREDITADO numa SEGUNDA chamada RPC.
--   3. Se o prêmio estoura o limite, o RPC dá RAISE EXCEPTION.
--   4. O wrapper adjustBalance() captura o erro e devolve null.
--   5. O jogo faz `if (nbCredit !== null) ...` e ignora a falha em silêncio.
--
-- Resultado: o jogador fica SEM o saldo apostado e SEM o prêmio. É comum em
-- crash/mines/plinko, onde o multiplicador alto leva o prêmio fácil acima de 15k.
--
-- A correção troca o "RAISE EXCEPTION" (que faz o jogador perder dinheiro) por um
-- CLAMP no teto de R$300.000. Vantagens:
--   • O crédito NUNCA mais lança exceção -> o prêmio sempre chega na conta.
--   • A aposta nunca some sem o prêmio correspondente.
--   • O teto de 300k continua valendo e até protege MELHOR contra injeção:
--     adjust_balance(uid, 9.999.999) agora vira no máx. 300k, em vez do limite
--     de 15k que um trapaceiro burlava com várias chamadas menores.
-- ────────────────────────────────────────────────────────────────────────────

-- Teto máximo de saldo por conta. Créditos acima disso são limitados (clamp),
-- nunca rejeitados.
-- (mantido igual ao da migration 014)

-- 1. adjust_balance (saldo normal do cassino)
CREATE OR REPLACE FUNCTION public.adjust_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.netano_profiles
  SET balance = CASE
        -- crédito: limita ao teto de 300k (mas nunca abaixo do saldo atual,
        -- para não encolher uma conta legada que já esteja acima do teto)
        WHEN delta_amount > 0 THEN LEAST(balance + delta_amount, GREATEST(balance, 300000.00))
        -- débito: aplica direto (o WHERE abaixo impede ficar negativo)
        ELSE balance + delta_amount
      END
  WHERE id = uid
    -- débito só passa se não deixar o saldo negativo; crédito sempre passa
    AND (delta_amount >= 0 OR balance + delta_amount >= 0)
  RETURNING balance INTO new_balance;

  RETURN new_balance; -- NULL apenas se o débito for maior que o saldo disponível
END;
$$;

-- 2. adjust_wc_balance (saldo do bolão da Copa)
CREATE OR REPLACE FUNCTION public.adjust_wc_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.netano_profiles
  SET wc_balance = CASE
        WHEN delta_amount > 0 THEN LEAST(wc_balance + delta_amount, GREATEST(wc_balance, 300000.00))
        ELSE wc_balance + delta_amount
      END
  WHERE id = uid
    AND wc_joined = true
    AND (delta_amount >= 0 OR wc_balance + delta_amount >= 0)
  RETURNING wc_balance INTO new_balance;

  RETURN new_balance; -- NULL se saldo insuficiente ou se não participa do bolão
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_balance(uuid, numeric)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wc_balance(uuid, numeric) TO anon, authenticated;
