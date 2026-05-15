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
    console.error('adjust_balance failed', error, { userId, delta })
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
