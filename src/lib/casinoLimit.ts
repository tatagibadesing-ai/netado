"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";

export const MAX_BET_CREDITS = 60;
export const MAX_TIME_SECS   = 20 * 60; // 20 minutos

// Créditos gastos por aposta em cada jogo
export const BET_CREDITS: Record<string, number> = {
  plinko:  1,
  slots:   1,
  mines:   2,
  dice:    2,
  derby:   2,
  double:  3,
  crash:   3,
};

export interface CasinoLimitState {
  betCreditsUsed: number;
  timeSecsUsed:   number;
  blocked:        boolean; // true se qualquer limite foi atingido
  betBlocked:     boolean;
  timeBlocked:    boolean;
  loaded:         boolean;
}

// Gasta créditos de aposta atomicamente via RPC.
// Retorna true se a aposta foi permitida, false se bloqueada.
export async function spendBetCredits(userId: string, game: string): Promise<boolean> {
  const credits = BET_CREDITS[game] ?? 1;
  const { data, error } = await supabase.rpc("casino_spend_bet_credits", {
    uid:         userId,
    credits,
    max_credits: MAX_BET_CREDITS,
  });
  if (error) { console.error("casino_spend_bet_credits error", error); return false; }
  return data !== -1;
}

// Hook que carrega o uso atual e rastreia tempo de sessão em background.
// Bloqueia automaticamente quando qualquer limite é atingido.
export function useCasinoLimit(userId: string | null) {
  const [state, setState] = useState<CasinoLimitState>({
    betCreditsUsed: 0,
    timeSecsUsed:   0,
    blocked:        false,
    betBlocked:     false,
    timeBlocked:    false,
    loaded:         false,
  });

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart  = useRef<number>(Date.now());
  const lastFlush     = useRef<number>(0); // segundos já enviados ao servidor

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc("casino_get_usage", { uid: userId });
    if (error || !data) return;
    const row = Array.isArray(data) ? data[0] : data;
    const bc = row?.bet_credits ?? 0;
    const ts = row?.time_secs   ?? 0;
    setState({
      betCreditsUsed: bc,
      timeSecsUsed:   ts,
      betBlocked:     bc >= MAX_BET_CREDITS,
      timeBlocked:    ts >= MAX_TIME_SECS,
      blocked:        bc >= MAX_BET_CREDITS || ts >= MAX_TIME_SECS,
      loaded:         true,
    });
    // Reseta o ponto de referência da sessão para não contar tempo já registrado
    sessionStart.current = Date.now();
    lastFlush.current    = 0;
  }, [userId]);

  // Flush de tempo a cada 30 s (e no unmount)
  const flushTime = useCallback(async (force = false) => {
    if (!userId) return;
    const elapsed = Math.floor((Date.now() - sessionStart.current) / 1000);
    const newSecs = elapsed - lastFlush.current;
    if (newSecs < 30 && !force) return;
    if (newSecs <= 0) return;
    lastFlush.current = elapsed;

    const { data, error } = await supabase.rpc("casino_spend_time", {
      uid:      userId,
      secs:     newSecs,
      max_secs: MAX_TIME_SECS,
    });
    if (error) return;
    const total = data as number;
    setState(prev => ({
      ...prev,
      timeSecsUsed: total === -1 ? MAX_TIME_SECS : total,
      timeBlocked:  total === -1 || total >= MAX_TIME_SECS,
      blocked:      prev.betBlocked || total === -1 || total >= MAX_TIME_SECS,
    }));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    intervalRef.current = setInterval(() => flushTime(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      flushTime(true);
    };
  }, [userId, load, flushTime]);

  // Após gastar créditos de aposta, atualiza o estado local
  const onBetSpent = useCallback((game: string) => {
    const credits = BET_CREDITS[game] ?? 1;
    setState(prev => {
      const newBc = prev.betCreditsUsed + credits;
      return {
        ...prev,
        betCreditsUsed: newBc,
        betBlocked:     newBc >= MAX_BET_CREDITS,
        blocked:        newBc >= MAX_BET_CREDITS || prev.timeBlocked,
      };
    });
  }, []);

  return { ...state, onBetSpent };
}
