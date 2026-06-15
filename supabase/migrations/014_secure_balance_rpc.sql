-- ────────────────────────────────────────────────────────────────────────────
-- Segurança nas funções RPC de saldo (adjust_balance e adjust_wc_balance)
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Proteger a função public.adjust_balance
CREATE OR REPLACE FUNCTION public.adjust_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  -- Se for chamada do cliente (não-service_role), aplicamos limites de segurança
  IF auth.role() <> 'service_role' THEN
    -- Limite de ganho por transação
    IF delta_amount > 15000.00 THEN
      RAISE EXCEPTION 'O valor do prêmio excede o limite máximo permitido por rodada.';
    END IF;

    -- Limite de saldo máximo acumulado na plataforma para evitar burlas/injetar milhões
    IF EXISTS (
      SELECT 1 FROM public.netano_profiles 
      WHERE id = uid AND balance + delta_amount > 300000.00
    ) THEN
      RAISE EXCEPTION 'O saldo final excede o limite máximo permitido para a conta.';
    END IF;
  END IF;

  UPDATE public.netano_profiles
  SET balance = balance + delta_amount
  WHERE id = uid
    AND (delta_amount >= 0 OR balance + delta_amount >= 0)
  RETURNING balance INTO new_balance;

  RETURN new_balance; -- NULL se o saldo for insuficiente
END;
$$;

-- 2. Proteger a função public.adjust_wc_balance
CREATE OR REPLACE FUNCTION public.adjust_wc_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  -- Se for chamada do cliente (não-service_role), aplicamos limites de segurança
  IF auth.role() <> 'service_role' THEN
    -- Limite de ganho por transação no bolão
    IF delta_amount > 15000.00 THEN
      RAISE EXCEPTION 'O valor do prêmio excede o limite máximo permitido por rodada.';
    END IF;

    -- Limite de saldo máximo acumulado no bolão
    IF EXISTS (
      SELECT 1 FROM public.netano_profiles 
      WHERE id = uid AND wc_balance + delta_amount > 300000.00
    ) THEN
      RAISE EXCEPTION 'O saldo final do bolão excede o limite máximo permitido.';
    END IF;
  END IF;

  UPDATE public.netano_profiles
  SET wc_balance = wc_balance + delta_amount
  WHERE id = uid
    AND wc_joined = true
    and (delta_amount >= 0 OR wc_balance + delta_amount >= 0)
  RETURNING wc_balance INTO new_balance;

  RETURN new_balance; -- NULL se saldo insuficiente ou se não participa do bolão
END;
$$;
