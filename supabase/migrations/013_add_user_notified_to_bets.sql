-- Adiciona coluna user_notified para rastrear se o usuário já viu o resultado da aposta
ALTER TABLE public.netano_bets 
ADD COLUMN user_notified boolean DEFAULT false;

-- Marca todas as apostas já resolvidas antigas como visualizadas (para não causar spam de popups antigos)
UPDATE public.netano_bets 
SET user_notified = true 
WHERE status IN ('won', 'lost', 'cancelled');
