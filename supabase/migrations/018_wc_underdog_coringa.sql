-- ────────────────────────────────────────────────────────────────────────────
-- Ajustes no Coringa Tradicional (cooldown de 3 dias) e Novo Coringa do Azarão (1 por dia)
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Re-cria a função use_wc_coringa para aplicar cooldown de 3 dias
CREATE OR REPLACE FUNCTION public.use_wc_coringa(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  flipped boolean;
  last_used date;
BEGIN
  SELECT wc_coringa_used_on INTO last_used FROM public.netano_profiles WHERE id = uid;
  
  -- Cooldown de 3 dias (ex: usou na Segunda-feira, só pode usar novamente na Quinta-feira)
  IF last_used IS NULL OR (today - last_used) >= 3 THEN
    UPDATE public.netano_profiles
    SET wc_coringa_used_on = today
    WHERE id = uid
      AND wc_joined = true
    RETURNING true INTO flipped;
  END IF;

  RETURN coalesce(flipped, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_wc_coringa(uuid) TO anon, authenticated;


-- 2) Cria a coluna para controle do Coringa do Azarão no Perfil
ALTER TABLE public.netano_profiles
ADD COLUMN IF NOT EXISTS wc_underdog_coringa_used_on date;


-- 3) Cria a coluna para marcar se a aposta usou o Coringa do Azarão
ALTER TABLE public.netano_bets
ADD COLUMN IF NOT EXISTS underdog_coringa boolean DEFAULT false;


-- 4) Função para consumir o Coringa do Azarão (limite de 1 por dia)
CREATE OR REPLACE FUNCTION public.use_wc_underdog_coringa(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  flipped boolean;
BEGIN
  UPDATE public.netano_profiles
  SET wc_underdog_coringa_used_on = today
  WHERE id = uid
    AND wc_joined = true
    AND wc_underdog_coringa_used_on IS DISTINCT FROM today
  RETURNING true INTO flipped;

  RETURN coalesce(flipped, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_wc_underdog_coringa(uuid) TO anon, authenticated;
