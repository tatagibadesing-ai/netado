-- ────────────────────────────────────────────────────────────────────────────
-- Coringa do Bolão da Copa (ganhos em dobro)
-- ────────────────────────────────────────────────────────────────────────────
-- Cada participante ganha 1 coringa por dia. Ao aplicá-lo numa aposta, se ela
-- vencer o retorno é pago em DOBRO. O consumo é atômico (1 por dia) pra não dar
-- pra gastar o mesmo coringa em duas abas/dispositivos.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Data (no fuso de Brasília) em que o coringa foi usado pela última vez.
--    NULL = nunca usou; disponível enquanto for diferente de "hoje".
ALTER TABLE public.netano_profiles
ADD COLUMN IF NOT EXISTS wc_coringa_used_on date;

-- 2) Marca a aposta que usou coringa (só pra exibir o selo; o prêmio dobrado já
--    fica gravado em potential_return no momento da aposta).
ALTER TABLE public.netano_bets
ADD COLUMN IF NOT EXISTS coringa boolean DEFAULT false;

-- 3) Consome o coringa do dia de forma atômica. Retorna TRUE só se ESTE chamada
--    foi quem realmente marcou o uso de hoje (igual ao truque do .select() nas
--    apostas: quem casa 0 linhas não recebe o benefício).
CREATE OR REPLACE FUNCTION public.use_wc_coringa(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  flipped boolean;
BEGIN
  UPDATE public.netano_profiles
  SET wc_coringa_used_on = today
  WHERE id = uid
    AND wc_joined = true
    AND wc_coringa_used_on IS DISTINCT FROM today
  RETURNING true INTO flipped;

  RETURN coalesce(flipped, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_wc_coringa(uuid) TO anon, authenticated;
