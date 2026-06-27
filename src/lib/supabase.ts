import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Atomic credit/debit via server-side RPC. Returns the new balance on success
// or null if the debit would have made the balance go below zero.
// All bet placement, cashouts and casino game payouts must go through this
// to stay consistent across multiple browser tabs.
export async function adjustBalance(userId: string, delta: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('adjust_balance', {
    uid: userId,
    delta_amount: delta,
  })
  if (error) {
    console.error('adjust_balance failed', {
      message: error.message,
      details: error.details,
      code: error.code,
      hint: error.hint
    }, { userId, delta })
    return null
  }
  if (data === null || data === undefined) {
    console.warn('adjust_balance returned null (insufficient funds?)', { userId, delta })
    return null
  }
  // Postgres `numeric` arrives as string in some PostgREST versions; coerce.
  const n = typeof data === 'number' ? data : parseFloat(String(data))
  if (Number.isNaN(n)) {
    console.error('adjust_balance returned non-numeric', data)
    return null
  }
  return n
}

// Read the canonical balance from the server. Use this whenever local cache
// might be stale (e.g. after a tab regains focus, or before a critical write).
export async function fetchBalance(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('netano_profiles')
    .select('balance')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data.balance as number
}

// Atomic credit/debit for the World Cup pool (wc_balance) via server-side RPC.
export async function adjustWcBalance(userId: string, delta: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('adjust_wc_balance', {
    uid: userId,
    delta_amount: delta,
  })
  if (error) {
    console.error('adjust_wc_balance failed', {
      message: error.message,
      details: error.details,
      code: error.code,
      hint: error.hint
    }, { userId, delta })
    return null
  }
  if (data === null || data === undefined) {
    console.warn('adjust_wc_balance returned null (insufficient funds?)', { userId, delta })
    return null
  }
  const n = typeof data === 'number' ? data : parseFloat(String(data))
  if (Number.isNaN(n)) {
    console.error('adjust_wc_balance returned non-numeric', data)
    return null
  }
  return n
}

// Consome (atomicamente) o coringa do dia do usuário no bolão. Retorna true só
// se ESTE cliente foi quem realmente gastou o coringa de hoje — evita usar o
// mesmo coringa em duas abas. Ver migration 017.
export async function useWcCoringa(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('use_wc_coringa', { uid: userId })
  if (error) {
    console.error('use_wc_coringa failed', {
      message: error.message,
      details: error.details,
      code: error.code,
      hint: error.hint,
    }, { userId })
    return false
  }
  return data === true
}
