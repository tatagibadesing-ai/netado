-- Adiciona colunas para o bolão da Copa do Mundo na tabela netano_profiles
ALTER TABLE public.netano_profiles
ADD COLUMN IF NOT EXISTS wc_joined boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wc_balance numeric DEFAULT 1000.00;

-- Adiciona coluna para marcar apostas do bolão na tabela netano_bets
ALTER TABLE public.netano_bets
ADD COLUMN IF NOT EXISTS is_wc_bet boolean DEFAULT false;

-- Função atômica para ajustar o saldo do bolão (wc_balance)
CREATE OR REPLACE FUNCTION public.adjust_wc_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.netano_profiles
  SET wc_balance = wc_balance + delta_amount
  WHERE id = uid
    AND wc_joined = true
    AND (delta_amount >= 0 OR wc_balance + delta_amount >= 0)
  RETURNING wc_balance INTO new_balance;

  RETURN new_balance; -- Retorna NULL se saldo insuficiente ou se não participa do bolão
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_wc_balance(uuid, numeric) TO anon, authenticated;
