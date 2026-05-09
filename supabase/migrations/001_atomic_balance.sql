-- Atomic balance adjustment.
-- Runs `balance = balance + delta_amount` server-side. If delta is negative
-- and would push the balance below zero, returns NULL and makes no change.
-- Otherwise returns the new balance.
--
-- Usage from the client:
--   await supabase.rpc('adjust_balance', { uid: userId, delta_amount: -10 })
--
-- This eliminates the multi-tab race where two browsers each cache the
-- old balance and overwrite each other's writes. Every credit/debit goes
-- through this function instead of UPDATE balance = X.

CREATE OR REPLACE FUNCTION public.adjust_balance(uid uuid, delta_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.netano_profiles
  SET balance = balance + delta_amount
  WHERE id = uid
    AND (delta_amount >= 0 OR balance + delta_amount >= 0)
  RETURNING balance INTO new_balance;

  RETURN new_balance; -- NULL if the row was not updated (insufficient funds)
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_balance(uuid, numeric) TO anon, authenticated;
