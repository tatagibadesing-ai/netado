"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Match, OddType, initialMatches } from "../data/matches";
import { supabase } from "../lib/supabase";

export interface SlipItem {
  matchId: string;
  oddType: OddType;
  oddValue: number;
  homeTeam?: string;
  awayTeam?: string;
  homeLogo?: string;
  awayLogo?: string;
  finalHomeScore?: number;
  finalAwayScore?: number;
  resolvedAt?: string;
}

export interface PlacedBet {
  id: string;
  amount: number;
  picks: SlipItem[];
  totalOdds: number;
  potentialReturn: number;
  status: "pending" | "won" | "lost";
}

interface BetContextType {
  userId: string | null;
  username: string | null;
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
  login: (userId: string, username: string, balance: number) => void;
  logout: () => void;
  balance: number;
  matches: Match[];
  isLoadingMatches: boolean;
  betSlip: SlipItem[];
  placedBets: PlacedBet[];
  selectedLeague: string | null;
  activeTab: "apostas" | "historico";
  addToSlip: (matchId: string, oddType: OddType, oddValue: number) => void;
  removeFromSlip: (matchId: string, oddType: OddType) => void;
  clearSlip: () => void;
  placeBet: (amount: number) => void;
  resetAll: () => void;
  refreshMatches: () => void;
  setSelectedLeague: (league: string | null) => void;
  setActiveTab: (tab: "apostas" | "historico") => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

export const isPickWon = (pick: SlipItem, match: Match): boolean | null => {
  if (!match.isFinished) return null;
  const h = match.homeScore || 0;
  const a = match.awayScore || 0;
  const total = h + a;
  switch (pick.oddType) {
    case 'home': return h > a;
    case 'draw': return h === a;
    case 'away': return h < a;
    case 'over05': return total > 0.5;
    case 'under05': return total < 0.5;
    case 'over15': return total > 1.5;
    case 'under15': return total < 1.5;
    case 'over25': return total > 2.5;
    case 'under25': return total < 2.5;
    case 'over35': return total > 3.5;
    case 'under35': return total < 3.5;
    case 'over45': return total > 4.5;
    case 'under45': return total < 4.5;
    case 'bttsYes': return h > 0 && a > 0;
    case 'bttsNo': return h === 0 || a === 0;
    case 'dc1x': return h >= a;
    case 'dcx2': return a >= h;
    case 'dc12': return h !== a;
    default: return false;
  }
};

export function BetProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [balance, setBalance] = useState<number>(1000.0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
  const [betSlip, setBetSlip] = useState<SlipItem[]>([]);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"apostas" | "historico">("apostas");

  // ── Auth ───────────────────────────────────────────────────────────
  const login = (uid: string, uname: string, bal: number) => {
    setUserId(uid);
    setUsername(uname);
    setBalance(bal);
    setIsLoggedIn(true);
    localStorage.setItem("netano_user", JSON.stringify({ uid, uname }));
  };

  const logout = () => {
    setUserId(null);
    setUsername(null);
    setIsLoggedIn(false);
    setPlacedBets([]);
    setBetSlip([]);
    localStorage.removeItem("netano_user");
  };

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem("netano_user");
    if (saved) {
      try {
        const { uid, uname } = JSON.parse(saved);
        supabase.from("netano_profiles").select("balance").eq("id", uid).single().then(({ data }) => {
          if (data) {
            setUserId(uid);
            setUsername(uname);
            setBalance(data.balance);
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem("netano_user");
          }
          setIsCheckingAuth(false);
        });
      } catch {
        localStorage.removeItem("netano_user");
        setIsCheckingAuth(false);
      }
    } else {
      setIsCheckingAuth(false);
    }
    fetchMatches();
  }, []);

  // Load bets from Supabase when user logs in
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("netano_bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const mapped: PlacedBet[] = data.map((b: any) => ({
            id: b.id,
            amount: b.amount,
            picks: b.picks,
            totalOdds: b.total_odds,
            potentialReturn: b.potential_return,
            status: b.status,
          }));
          setPlacedBets(mapped);
        }
      });
  }, [userId]);

  // ── Match fetching ─────────────────────────────────────────────────
  const fetchMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data && data.length > 0 ? data : initialMatches);
    } catch {
      setMatches(initialMatches);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // ── Bet evaluation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || matches.length === 0 || placedBets.length === 0) return;

    const toUpdate: { id: string; status: "won" | "lost"; picks: SlipItem[] }[] = [];
    let balanceDelta = 0;

    const enrichPickWithScore = (pick: SlipItem, match: Match): SlipItem => ({
      ...pick,
      finalHomeScore: match.homeScore ?? 0,
      finalAwayScore: match.awayScore ?? 0,
      resolvedAt: pick.resolvedAt ?? new Date().toISOString(),
    });

    const updated = placedBets.map((bet) => {
      if (bet.status !== "pending") return bet;
      let isPending = false;
      let hasLostPick = false;

      for (const pick of bet.picks) {
        const match = matches.find(m => m.id === pick.matchId);
        if (!match) {
          // No live data for this match. If we already snapshotted a final score,
          // re-evaluate from the snapshot so a finished bet never reverts to pending.
          if (pick.finalHomeScore !== undefined && pick.finalAwayScore !== undefined) {
            const snapMatch: Match = { ...(matches[0] ?? ({} as Match)), id: pick.matchId, isFinished: true, homeScore: pick.finalHomeScore, awayScore: pick.finalAwayScore } as Match;
            const r = isPickWon(pick, snapMatch);
            if (r === null) isPending = true;
            else if (r === false) { hasLostPick = true; break; }
            continue;
          }
          isPending = true;
          continue;
        }
        const result = isPickWon(pick, match);
        if (result === null) isPending = true;
        else if (result === false) { hasLostPick = true; break; }
      }

      if (hasLostPick) {
        const snapshotPicks = bet.picks.map(p => {
          const m = matches.find(mm => mm.id === p.matchId);
          return m && m.isFinished ? enrichPickWithScore(p, m) : p;
        });
        toUpdate.push({ id: bet.id, status: "lost", picks: snapshotPicks });
        return { ...bet, picks: snapshotPicks, status: "lost" as const };
      }
      if (!isPending) {
        const snapshotPicks = bet.picks.map(p => {
          const m = matches.find(mm => mm.id === p.matchId);
          return m && m.isFinished ? enrichPickWithScore(p, m) : p;
        });
        toUpdate.push({ id: bet.id, status: "won", picks: snapshotPicks });
        balanceDelta += bet.potentialReturn;
        return { ...bet, picks: snapshotPicks, status: "won" as const };
      }
      return bet;
    });

    if (toUpdate.length === 0) return;
    setPlacedBets(updated);
    toUpdate.forEach(({ id, status, picks }) =>
      supabase.from("netano_bets").update({ status, picks }).eq("id", id)
    );
    if (balanceDelta > 0) {
      const newBalance = balance + balanceDelta;
      setBalance(newBalance);
      supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId);
    }
  }, [matches, userId]);

  // ── Slip actions ───────────────────────────────────────────────────
  const addToSlip = (matchId: string, oddType: OddType, oddValue: number) => {
    setBetSlip(prev => {
      const filtered = prev.filter(item => !(item.matchId === matchId && item.oddType === oddType));
      return [...filtered, { matchId, oddType, oddValue }];
    });
  };

  const removeFromSlip = (matchId: string, oddType: OddType) =>
    setBetSlip(prev => prev.filter(item => !(item.matchId === matchId && item.oddType === oddType)));

  const clearSlip = () => setBetSlip([]);

  // ── Place Bet ──────────────────────────────────────────────────────
  const placeBet = async (amount: number) => {
    if (!userId || amount <= 0 || amount > balance || betSlip.length === 0) return;

    const totalOdds = betSlip.reduce((acc, item) => acc * item.oddValue, 1);
    const enrichedPicks = betSlip.map(item => {
      const match = matches.find(m => m.id === item.matchId);
      return {
        ...item,
        homeTeam: match?.homeTeam || item.homeTeam,
        awayTeam: match?.awayTeam || item.awayTeam,
        homeLogo: match?.homeLogo || item.homeLogo,
        awayLogo: match?.awayLogo || item.awayLogo,
      };
    });

    const newBet: PlacedBet = {
      id: Math.random().toString(36).substring(2, 9),
      amount,
      picks: enrichedPicks,
      totalOdds,
      potentialReturn: amount * totalOdds,
      status: "pending",
    };

    const newBalance = balance - amount;
    setBalance(newBalance);
    setPlacedBets(prev => [newBet, ...prev]);
    setBetSlip([]);

    await Promise.all([
      supabase.from("netano_bets").insert({
        id: newBet.id,
        user_id: userId,
        amount: newBet.amount,
        picks: newBet.picks,
        total_odds: newBet.totalOdds,
        potential_return: newBet.potentialReturn,
        status: newBet.status,
      }),
      supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId),
    ]);
  };

  const resetAll = () => {
    setBalance(1000);
    setBetSlip([]);
    setPlacedBets([]);
    if (userId) {
      supabase.from("netano_profiles").update({ balance: 1000 }).eq("id", userId);
      supabase.from("netano_bets").delete().eq("user_id", userId);
    }
    fetchMatches();
  };

  return (
    <BetContext.Provider
      value={{
        userId, username, isLoggedIn, isCheckingAuth, login, logout,
        balance, matches, isLoadingMatches, betSlip, placedBets,
        selectedLeague, activeTab,
        addToSlip, removeFromSlip, clearSlip, placeBet, resetAll,
        refreshMatches: fetchMatches, setSelectedLeague, setActiveTab,
      }}
    >
      {children}
    </BetContext.Provider>
  );
}

export function useBet() {
  const context = useContext(BetContext);
  if (!context) throw new Error("useBet must be used within a BetProvider");
  return context;
}
