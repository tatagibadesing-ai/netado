"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Match, OddType, initialMatches } from "../data/matches";
import { supabase, adjustBalance, adjustWcBalance } from "../lib/supabase";

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
  status: "pending" | "won" | "lost" | "cancelled";
  isWcBet?: boolean;
  userNotified?: boolean;
}

interface BetContextType {
  userId: string | null;
  username: string | null;
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
  login: (userId: string, username: string, balance: number, wcJoinedVal?: boolean, wcBalanceVal?: number, fName?: string | null) => void;
  logout: () => void;
  balance: number;
  matches: Match[];
  isLoadingMatches: boolean;
  betSlip: SlipItem[];
  placedBets: PlacedBet[];
  selectedLeague: string | null;
  activeTab: "apostas" | "historico";
  addToSlip: (matchId: string, oddType: OddType, oddValue: number) => void;
  canAddToSlip: (matchId: string, oddType: OddType) => boolean;
  removeFromSlip: (matchId: string, oddType: OddType) => void;
  clearSlip: () => void;
  placeBet: (amount: number) => void;
  resetAll: () => void;
  refreshMatches: (isInitial?: boolean) => void;
  setSelectedLeague: (league: string | null) => void;
  setActiveTab: (tab: "apostas" | "historico") => void;
  wcJoined: boolean;
  wcBalance: number;
  joinWcCompetition: () => Promise<void>;
  placeWinnerBet: (teamName: string, teamLogo: string, oddValue: number, amount: number) => Promise<boolean>;
  fullName: string | null;
  setFullName: (name: string | null) => void;
  markBetsAsNotified: (betIds: string[]) => Promise<void>;
  adminNotice: string | null;
  dismissAdminNotice: () => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

type MarketGroup = "result" | "totals" | "btts" | "champion";

const getMarketGroup = (oddType: OddType): MarketGroup => {
  if (["home", "draw", "away", "dc1x", "dcx2", "dc12"].includes(oddType)) return "result";
  if (oddType.startsWith("over") || oddType.startsWith("under")) return "totals";
  if (oddType === "bttsYes" || oddType === "bttsNo") return "btts";
  return "champion";
};

const doesPickMatchScore = (oddType: OddType, homeScore: number, awayScore: number): boolean => {
  const total = homeScore + awayScore;

  switch (oddType) {
    case "home": return homeScore > awayScore;
    case "draw": return homeScore === awayScore;
    case "away": return homeScore < awayScore;
    case "over05": return total > 0.5;
    case "under05": return total < 0.5;
    case "over15": return total > 1.5;
    case "under15": return total < 1.5;
    case "over25": return total > 2.5;
    case "under25": return total < 2.5;
    case "over35": return total > 3.5;
    case "under35": return total < 3.5;
    case "over45": return total > 4.5;
    case "under45": return total < 4.5;
    case "bttsYes": return homeScore > 0 && awayScore > 0;
    case "bttsNo": return homeScore === 0 || awayScore === 0;
    case "dc1x": return homeScore >= awayScore;
    case "dcx2": return awayScore >= homeScore;
    case "dc12": return homeScore !== awayScore;
    default: return false;
  }
};

const arePicksCompatible = (oddTypes: OddType[]): boolean => {
  const groups = oddTypes.map(getMarketGroup);
  if (new Set(groups).size !== groups.length) return false;

  for (let homeScore = 0; homeScore <= 10; homeScore++) {
    for (let awayScore = 0; awayScore <= 10; awayScore++) {
      if (oddTypes.every(type => doesPickMatchScore(type, homeScore, awayScore))) return true;
    }
  }

  return false;
};

export const isPickWon = (pick: SlipItem, match: Match): boolean | null => {
  if (!match.isFinished) return null;
  const h = match.homeScore || 0;
  const a = match.awayScore || 0;
  return doesPickMatchScore(pick.oddType, h, a);
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
  const [selectedLeague, setSelectedLeague] = useState<string | null>("Copa do Mundo");
  const [activeTab, setActiveTab] = useState<"apostas" | "historico">("apostas");

  // Estados do bolão da copa
  const [wcJoined, setWcJoined] = useState<boolean>(false);
  const [wcBalance, setWcBalance] = useState<number>(1000.0);
  const [fullName, setFullNameState] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // ── Auth ───────────────────────────────────────────────────────────
  const login = (uid: string, uname: string, bal: number, wcJoinedVal?: boolean, wcBalanceVal?: number, fName?: string | null) => {
    setUserId(uid);
    setUsername(uname);
    setBalance(bal);
    setIsLoggedIn(true);
    localStorage.setItem("netano_user", JSON.stringify({ uid, uname }));

    if (wcJoinedVal !== undefined) setWcJoined(wcJoinedVal);
    if (wcBalanceVal !== undefined) setWcBalance(wcBalanceVal);
    if (fName !== undefined) setFullNameState(fName);

    // Se o usuário já estiver logado, não buscamos novamente estes dados no banco,
    // pois eles já estão carregados no estado do React. Isso evita queries repetitivas e race conditions no cassino.
    if (!isLoggedIn && (wcJoinedVal === undefined || wcBalanceVal === undefined || fName === undefined)) {
      supabase
        .from("netano_profiles")
        .select("wc_joined, wc_balance, full_name, admin_notice")
        .eq("id", uid)
        .single()
        .then(({ data }) => {
          if (data) {
            if (wcJoinedVal === undefined) setWcJoined(data.wc_joined ?? false);
            if (wcBalanceVal === undefined) setWcBalance(Number(data.wc_balance) ?? 1000.00);
            if (fName === undefined) setFullNameState(data.full_name ?? null);
            setAdminNotice(data.admin_notice ?? null);
          }
        });
    }
  };

  const logout = () => {
    setUserId(null);
    setUsername(null);
    setIsLoggedIn(false);
    setPlacedBets([]);
    setBetSlip([]);
    setWcJoined(false);
    setWcBalance(1000.00);
    setFullNameState(null);
    setAdminNotice(null);
    localStorage.removeItem("netano_user");
  };

  const dismissAdminNotice = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("netano_profiles")
        .update({ admin_notice: null })
        .eq("id", userId);
      if (!error) {
        setAdminNotice(null);
      }
    } catch (err) {
      console.error("Erro ao dispensar aviso do admin:", err);
    }
  };

  const joinWcCompetition = async () => {
    if (!userId || wcJoined) return; // já participa — nunca reentrar/resetar o saldo
    try {
      // .eq("wc_joined", false) garante no banco que o saldo só é zerado para R$1000
      // num primeiro ingresso real. Quem já está no bolão casa 0 linhas e não é resetado,
      // mesmo que o estado local esteja desatualizado.
      const { data, error } = await supabase
        .from("netano_profiles")
        .update({ wc_joined: true, wc_balance: 1000.00 })
        .eq("id", userId)
        .eq("wc_joined", false)
        .select("id");
      if (error) {
        console.error("Erro ao entrar no bolão:", error);
        return;
      }
      if (data && data.length > 0) {
        // ingresso novo de fato — começa com R$1000
        setWcJoined(true);
        setWcBalance(1000.00);
      } else {
        // já participava no banco — só sincroniza a flag, sem mexer no saldo
        setWcJoined(true);
      }
    } catch (err) {
      console.error("Erro ao entrar no bolão:", err);
    }
  };

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem("netano_user");
    if (saved) {
      try {
        const { uid, uname } = JSON.parse(saved);
        supabase.from("netano_profiles").select("balance, wc_joined, wc_balance, full_name, admin_notice").eq("id", uid).single().then(({ data }) => {
          if (data) {
            setUserId(uid);
            setUsername(uname);
            setBalance(data.balance);
            setWcJoined(data.wc_joined ?? false);
            setWcBalance(Number(data.wc_balance) ?? 1000.00);
            setFullNameState(data.full_name ?? null);
            setAdminNotice(data.admin_notice ?? null);
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
    fetchMatches(true);
  }, []);

  // Poll matches every 30 seconds to keep live scores and odds updated in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatches(false);
    }, 30000);
    return () => clearInterval(interval);
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
            isWcBet: b.is_wc_bet,
            userNotified: b.user_notified,
          }));
          setPlacedBets(mapped);
        }
      });
  }, [userId]);

  // ── Match fetching ─────────────────────────────────────────────────
  const fetchMatches = async (isInitial = false) => {
    if (isInitial) setIsLoadingMatches(true);
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data && data.length > 0 ? data : initialMatches);
    } catch {
      if (isInitial) setMatches(initialMatches);
    } finally {
      if (isInitial) setIsLoadingMatches(false);
    }
  };

  // IDs de apostas já resolvidas nesta sessão — evita duplo crédito se matches recarregar
  const resolvedInSessionRef = React.useRef<Set<string>>(new Set());

  // ── Bet evaluation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || matches.length === 0 || placedBets.length === 0) return;

    const enrichPickWithScore = (pick: SlipItem, match: Match): SlipItem => ({
      ...pick,
      finalHomeScore: match.homeScore ?? 0,
      finalAwayScore: match.awayScore ?? 0,
      resolvedAt: pick.resolvedAt ?? new Date().toISOString(),
    });

    const toResolve: { id: string; status: "won" | "lost"; picks: SlipItem[]; payout: number; isWcBet: boolean }[] = [];

    const updated = placedBets.map((bet) => {
      // Já resolvida no banco ou nesta sessão — nunca recreditar
      if (bet.status !== "pending") return bet;
      if (resolvedInSessionRef.current.has(bet.id)) return bet;

      let isPending = false;
      let hasLostPick = false;

      for (const pick of bet.picks) {
        const match = matches.find(m => m.id === pick.matchId);
        if (!match) {
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
        resolvedInSessionRef.current.add(bet.id);
        toResolve.push({ id: bet.id, status: "lost", picks: snapshotPicks, payout: 0, isWcBet: !!bet.isWcBet });
        return { ...bet, picks: snapshotPicks, status: "lost" as const };
      }
      if (!isPending) {
        const snapshotPicks = bet.picks.map(p => {
          const m = matches.find(mm => mm.id === p.matchId);
          return m && m.isFinished ? enrichPickWithScore(p, m) : p;
        });
        resolvedInSessionRef.current.add(bet.id);
        toResolve.push({ id: bet.id, status: "won", picks: snapshotPicks, payout: bet.potentialReturn, isWcBet: !!bet.isWcBet });
        return { ...bet, picks: snapshotPicks, status: "won" as const };
      }
      return bet;
    });

    if (toResolve.length === 0) return;
    setPlacedBets(updated);

    // Atualiza banco e credita — cada aposta de forma independente e atômica.
    // O .select() é ESSENCIAL: no Supabase um update que não casa nenhuma linha
    // NÃO retorna erro, retorna uma lista vazia. Só creditamos se ESTE cliente foi
    // quem realmente virou a aposta de "pending" -> resolvida. Sem isso, uma segunda
    // aba/dispositivo recreditava o prêmio a cada poll (saldo "aumentando sozinho").
    toResolve.forEach(async ({ id, status, picks, payout, isWcBet }) => {
      const { data: flipped, error } = await supabase
        .from("netano_bets")
        .update({ status, picks })
        .eq("id", id)
        .eq("status", "pending") // só atualiza se ainda estiver pending no banco
        .select("id");
      if (error) return; // erro real — não creditar
      if (!flipped || flipped.length === 0) return; // outro cliente já resolveu — não recreditar
      if (status === "won" && payout > 0) {
        if (isWcBet) {
          const nb = await adjustWcBalance(userId, payout);
          if (nb !== null) setWcBalance(nb);
        } else {
          const nb = await adjustBalance(userId, payout);
          if (nb !== null) setBalance(nb);
        }
      }
    });
  }, [matches, userId]);

  // ── Slip actions ───────────────────────────────────────────────────
  const canAddToSlip = (matchId: string, oddType: OddType) => {
    const selectedGroup = getMarketGroup(oddType);
    const otherPicks = betSlip.filter(
      item => item.matchId === matchId && getMarketGroup(item.oddType) !== selectedGroup
    );

    return arePicksCompatible([...otherPicks.map(item => item.oddType), oddType]);
  };

  const addToSlip = (matchId: string, oddType: OddType, oddValue: number) => {
    setBetSlip(prev => {
      const selectedGroup = getMarketGroup(oddType);
      const otherPicks = prev.filter(
        item => item.matchId === matchId && getMarketGroup(item.oddType) !== selectedGroup
      );

      if (!arePicksCompatible([...otherPicks.map(item => item.oddType), oddType])) return prev;

      // Troca apenas o palpite da mesma categoria e mantém mercados complementares.
      const filtered = prev.filter(
        item => item.matchId !== matchId || getMarketGroup(item.oddType) !== selectedGroup
      );
      return [...filtered, { matchId, oddType, oddValue }];
    });
  };

  const removeFromSlip = (matchId: string, oddType: OddType) =>
    setBetSlip(prev => prev.filter(item => !(item.matchId === matchId && item.oddType === oddType)));

  const clearSlip = () => setBetSlip([]);

  // ── Place Bet ──────────────────────────────────────────────────────
  const placeBet = async (amount: number) => {
    if (!userId || amount <= 0 || betSlip.length === 0) return;

    const picksByMatch = betSlip.reduce<Record<string, OddType[]>>((groups, item) => {
      groups[item.matchId] = [...(groups[item.matchId] || []), item.oddType];
      return groups;
    }, {});
    if (Object.values(picksByMatch).some(oddTypes => !arePicksCompatible(oddTypes))) {
      console.error("O cupom contém mercados duplicados ou incompatíveis na mesma partida.");
      return;
    }

    const hasStartedMatch = betSlip.some(item => {
      const match = matches.find(m => m.id === item.matchId);
      return match ? (match.isLive || match.isFinished || match.time === "FINALIZADO") : false;
    });

    if (hasStartedMatch) {
      console.error("Não é possível apostar em partidas que já começaram ou terminaram.");
      return;
    }

    const allMatchesWc = betSlip.every(item => {
      const match = matches.find(m => m.id === item.matchId);
      return match?.league?.toLowerCase() === "copa do mundo";
    });
    const isWcBet = wcJoined && allMatchesWc;

    const currentBalance = isWcBet ? wcBalance : balance;
    if (amount > currentBalance) return;

    // Bolão constraint: max 75% of current wc balance
    if (isWcBet && amount > currentBalance * 0.75) {
      console.error("Aposta excede o limite de 75% do saldo do bolão");
      return;
    }

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
      isWcBet,
      userNotified: false,
    };

    if (isWcBet) {
      const nb = await adjustWcBalance(userId, -amount);
      if (nb === null) return;
      setWcBalance(nb);
    } else {
      const nb = await adjustBalance(userId, -amount);
      if (nb === null) return;
      setBalance(nb);
    }

    setPlacedBets(prev => [newBet, ...prev]);
    setBetSlip([]);

    await supabase.from("netano_bets").insert({
      id: newBet.id,
      user_id: userId,
      amount: newBet.amount,
      picks: newBet.picks,
      total_odds: newBet.totalOdds,
      potential_return: newBet.potentialReturn,
      status: newBet.status,
      is_wc_bet: newBet.isWcBet,
      user_notified: false,
    });
  };

  const placeWinnerBet = async (teamName: string, teamLogo: string, oddValue: number, amount: number): Promise<boolean> => {
    if (!userId || amount <= 0) return false;

    const winnerDeadline = new Date("2026-06-22T23:59:59-04:00");
    if (new Date() >= winnerDeadline) {
      console.error("Palpites para campeão da Copa estão encerrados.");
      return false;
    }

    if (amount > wcBalance) return false;
    if (amount > wcBalance * 0.75) return false;

    const newBetId = "wc_winner_" + Math.random().toString(36).substring(2, 9);
    const newBet: PlacedBet = {
      id: newBetId,
      amount,
      picks: [
        {
          matchId: "copa_winner",
          oddType: "champion",
          oddValue,
          homeTeam: teamName,
          awayTeam: "Campeão da Copa",
          homeLogo: teamLogo,
          awayLogo: "/logocopa.webp"
        }
      ],
      totalOdds: oddValue,
      potentialReturn: amount * oddValue,
      status: "pending",
      isWcBet: true,
      userNotified: false,
    };

    const nb = await adjustWcBalance(userId, -amount);
    if (nb === null) return false;
    setWcBalance(nb);

    setPlacedBets(prev => [newBet, ...prev]);

    await supabase.from("netano_bets").insert({
      id: newBet.id,
      user_id: userId,
      amount: newBet.amount,
      picks: newBet.picks,
      total_odds: newBet.totalOdds,
      potential_return: newBet.potentialReturn,
      status: newBet.status,
      is_wc_bet: newBet.isWcBet,
      user_notified: false,
    });

    return true;
  };

  const markBetsAsNotified = async (betIds: string[]) => {
    if (betIds.length === 0) return;
    try {
      const { error } = await supabase
        .from("netano_bets")
        .update({ user_notified: true })
        .in("id", betIds);

      if (!error) {
        setPlacedBets(prev =>
          prev.map((b) => betIds.includes(b.id) ? { ...b, userNotified: true } : b)
        );
      }
    } catch (err) {
      console.error("Erro ao marcar apostas como notificadas:", err);
    }
  };

  const resetAll = () => {
    setBalance(1000);
    setBetSlip([]);
    setPlacedBets([]);
    setWcJoined(false);
    setWcBalance(1000.00);
    if (userId) {
      supabase.from("netano_profiles").update({ balance: 1000, wc_joined: false, wc_balance: 1000.00 }).eq("id", userId);
      supabase.from("netano_bets").delete().eq("user_id", userId);
    }
    fetchMatches(true);
  };

  return (
    <BetContext.Provider
      value={{
        userId, username, isLoggedIn, isCheckingAuth, login, logout,
        balance, matches, isLoadingMatches, betSlip, placedBets,
        selectedLeague, activeTab,
        addToSlip, canAddToSlip, removeFromSlip, clearSlip, placeBet, resetAll,
        refreshMatches: fetchMatches, setSelectedLeague, setActiveTab,
        wcJoined, wcBalance, joinWcCompetition, placeWinnerBet,
        fullName, setFullName: setFullNameState, markBetsAsNotified,
        adminNotice, dismissAdminNotice
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
