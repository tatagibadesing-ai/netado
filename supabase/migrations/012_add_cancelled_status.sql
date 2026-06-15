-- Altera a restrição de verificação do status para permitir 'cancelled'
ALTER TABLE public.netano_bets 
DROP CONSTRAINT IF EXISTS netano_bets_status_check;

ALTER TABLE public.netano_bets 
ADD CONSTRAINT netano_bets_status_check 
CHECK (status IN ('pending', 'won', 'lost', 'cancelled'));
