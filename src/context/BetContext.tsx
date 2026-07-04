"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Match, OddType, initialMatches } from "../data/matches";
import { supabase, adjustBalance, adjustWcBalance, useWcCoringa, useWcUnderdogCoringa } from "../lib/supabase";
import { doesPickMatchScore, getMarketGroup, picksCanCoexist, computeTotalOdds, findUnderdogPick } from "../lib/odds";

// Data de "hoje" no fuso de Brasília (YYYY-MM-DD), pra bater com a coluna
// wc_coringa_used_on gravada pela RPC use_wc_coringa.
const todaySaoPaulo = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Fator de lucro por sequência de acertos no bolão: cada vitória seguida vale
// +5% de lucro (compõe — 2 seguidas = 1.05², etc.).
export const STREAK_PROFIT_STEP = 1.05;
export const CORINGA_PROFIT_FACTOR = 1.5; // coringa: 1.5x de lucro no Jogo do Coringa

// Sequência atual e recorde de acertos do bolão, derivadas do histórico
// resolvido (ordenado pelo momento da resolução). Sem estado no banco.
function wcStreakStats(bets: PlacedBet[]): { current: number; best: number } {
  const resolved = bets
    .filter((b) => b.isWcBet && (b.status === "won" || b.status === "lost"))
    .map((b) => ({
      won: b.status === "won",
      t: Math.max(0, ...b.picks.map((p) => (p.resolvedAt ? new Date(p.resolvedAt).getTime() : 0))),
    }))
    .sort((a, b) => a.t - b.t);

  let current = 0;
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (resolved[i].won) current++;
    else break;
  }
  let best = 0, run = 0;
  for (const r of resolved) {
    if (r.won) { run++; if (run > best) best = run; }
    else run = 0;
  }
  return { current, best };
}

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
  coringa?: boolean;
  underdogCoringa?: boolean;
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
  placeBet: (amount: number, useCoringa?: boolean, useUnderdogCoringa?: boolean) => void;
  resetAll: () => void;
  refreshMatches: (isInitial?: boolean) => void;
  setSelectedLeague: (league: string | null) => void;
  setActiveTab: (tab: "apostas" | "historico") => void;
  wcJoined: boolean;
  wcBalance: number;
  wcCoringaAvailable: boolean;
  wcUnderdogCoringaAvailable: boolean;
  wcCoringaUsedOn: string | null;
  wcUnderdogCoringaUsedOn: string | null;
  wcStreak: number;
  wcBestStreak: number;
  joinWcCompetition: () => Promise<void>;
  placeWinnerBet: (teamName: string, teamLogo: string, oddValue: number, amount: number) => Promise<boolean>;
  fullName: string | null;
  setFullName: (name: string | null) => void;
  markBetsAsNotified: (betIds: string[]) => Promise<void>;
  adminNotice: string | null;
  dismissAdminNotice: () => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

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
  const [wcCoringaUsedOn, setWcCoringaUsedOn] = useState<string | null>(null);
  const [wcUnderdogCoringaUsedOn, setWcUnderdogCoringaUsedOn] = useState<string | null>(null);
  const [fullName, setFullNameState] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Coringa tradicional com cooldown de 3 dias
  const wcCoringaAvailable = React.useMemo(() => {
    if (!wcJoined) return false;
    if (!wcCoringaUsedOn) return true;

    try {
      const today = new Date(todaySaoPaulo());
      const lastUsed = new Date(wcCoringaUsedOn);
      
      const diffTime = Math.abs(today.getTime() - lastUsed.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 3;
    } catch (e) {
      return wcCoringaUsedOn !== todaySaoPaulo();
    }
  }, [wcJoined, wcCoringaUsedOn]);

  // Coringa do Azarão disponível 1 vez por dia
  const wcUnderdogCoringaAvailable = wcJoined && wcUnderdogCoringaUsedOn !== todaySaoPaulo();

  // Sequência de acertos do bolão (atual + recorde), derivada do histórico.
  const { current: wcStreak, best: wcBestStreak } = wcStreakStats(placedBets);

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
        .select("wc_joined, wc_balance, full_name, admin_notice, wc_coringa_used_on, wc_underdog_coringa_used_on")
        .eq("id", uid)
        .single()
        .then(({ data }) => {
          if (data) {
            if (wcJoinedVal === undefined) setWcJoined(data.wc_joined ?? false);
            if (wcBalanceVal === undefined) setWcBalance(Number(data.wc_balance) ?? 1000.00);
            if (fName === undefined) setFullNameState(data.full_name ?? null);
            setAdminNotice(data.admin_notice ?? null);
            setWcCoringaUsedOn(data.wc_coringa_used_on ?? null);
            setWcUnderdogCoringaUsedOn(data.wc_underdog_coringa_used_on ?? null);
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
    setWcCoringaUsedOn(null);
    setWcUnderdogCoringaUsedOn(null);
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
        supabase.from("netano_profiles").select("balance, wc_joined, wc_balance, full_name, admin_notice, wc_coringa_used_on, wc_underdog_coringa_used_on").eq("id", uid).single().then(({ data }) => {
          if (data) {
            setUserId(uid);
            setUsername(uname);
            setBalance(data.balance);
            setWcJoined(data.wc_joined ?? false);
            setWcBalance(Number(data.wc_balance) ?? 1000.00);
            setFullNameState(data.full_name ?? null);
            setAdminNotice(data.admin_notice ?? null);
            setWcCoringaUsedOn(data.wc_coringa_used_on ?? null);
            setWcUnderdogCoringaUsedOn(data.wc_underdog_coringa_used_on ?? null);
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
            coringa: b.coringa,
            underdogCoringa: b.underdog_coringa,
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
        if (pick.matchId === "copa_winner") {
          const finalMatch = matches.find(m => m.id === "760517");
          if (!finalMatch || !finalMatch.isFinished) {
            isPending = true;
            continue;
          }
          let champion: string | null = null;
          if (finalMatch.homeWinner) {
            champion = finalMatch.homeTeam;
          } else if (finalMatch.awayWinner) {
            champion = finalMatch.awayTeam;
          } else if (finalMatch.homeScore !== undefined && finalMatch.awayScore !== undefined) {
            if (finalMatch.homeScore > finalMatch.awayScore) {
              champion = finalMatch.homeTeam;
            } else if (finalMatch.awayScore > finalMatch.homeScore) {
              champion = finalMatch.awayTeam;
            }
          }

          if (!champion) {
            isPending = true;
            continue;
          }

          const won = !!pick.homeTeam && pick.homeTeam.toLowerCase() === champion.toLowerCase();
          if (!won) {
            hasLostPick = true;
            break;
          }
          continue;
        }

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
          if (p.matchId === "copa_winner") {
            const finalMatch = matches.find(mm => mm.id === "760517");
            return {
              ...p,
              finalHomeScore: finalMatch?.homeScore ?? 0,
              finalAwayScore: finalMatch?.awayScore ?? 0,
              resolvedAt: new Date().toISOString(),
            };
          }
          const m = matches.find(mm => mm.id === p.matchId);
          return m && m.isFinished ? enrichPickWithScore(p, m) : p;
        });
        resolvedInSessionRef.current.add(bet.id);
        toResolve.push({ id: bet.id, status: "lost", picks: snapshotPicks, payout: 0, isWcBet: !!bet.isWcBet });
        return { ...bet, picks: snapshotPicks, status: "lost" as const };
      }
      if (!isPending) {
        const snapshotPicks = bet.picks.map(p => {
          if (p.matchId === "copa_winner") {
            const finalMatch = matches.find(mm => mm.id === "760517");
            return {
              ...p,
              finalHomeScore: finalMatch?.homeScore ?? 0,
              finalAwayScore: finalMatch?.awayScore ?? 0,
              resolvedAt: new Date().toISOString(),
            };
          }
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
  // Permite combinar mercados de grupos diferentes na mesma partida (1 por grupo),
  // desde que possam vencer juntos. Bloqueia só os contraditórios. A correção do
  // exploit não está aqui — está na precificação (computeTotalOdds), que usa a
  // probabilidade real do placar em vez de multiplicar odds correlacionadas.
  const canAddToSlip = (matchId: string, oddType: OddType) => {
    const selectedGroup = getMarketGroup(oddType);
    const otherPicks = betSlip.filter(
      item => item.matchId === matchId && getMarketGroup(item.oddType) !== selectedGroup
    );
    return picksCanCoexist([...otherPicks.map(item => item.oddType), oddType]);
  };

  const addToSlip = (matchId: string, oddType: OddType, oddValue: number) => {
    setBetSlip(prev => {
      const selectedGroup = getMarketGroup(oddType);
      const otherPicks = prev.filter(
        item => item.matchId === matchId && getMarketGroup(item.oddType) !== selectedGroup
      );

      if (!picksCanCoexist([...otherPicks.map(item => item.oddType), oddType])) return prev;

      // Troca apenas o palpite do mesmo grupo e mantém os mercados complementares.
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
  const placeBet = async (amount: number, useCoringa: boolean = false, useUnderdogCoringa: boolean = false) => {
    if (!userId || amount <= 0 || betSlip.length === 0) return;

    const picksByMatch = betSlip.reduce<Record<string, OddType[]>>((groups, item) => {
      groups[item.matchId] = [...(groups[item.matchId] || []), item.oddType];
      return groups;
    }, {});
    if (Object.values(picksByMatch).some(oddTypes => !picksCanCoexist(oddTypes))) {
      console.error("O cupom contém mercados incompatíveis na mesma partida.");
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

    // Debita o valor primeiro — só depois mexemos no coringa, pra nunca queimar
    // o coringa numa aposta que falhou no débito.
    if (isWcBet) {
      const nb = await adjustWcBalance(userId, -amount);
      if (nb === null) return;
      setWcBalance(nb);
    } else {
      const nb = await adjustBalance(userId, -amount);
      if (nb === null) return;
      setBalance(nb);
    }

    // Coringa: só vale no bolão E somente no "Jogo do Coringa" do dia.
    const coringaEligible =
      isWcBet && betSlip.every((item) => matches.find((m) => m.id === item.matchId)?.isCoringaGame);

    let coringaApplied = false;
    if (useCoringa && coringaEligible && wcCoringaAvailable) {
      coringaApplied = await useWcCoringa(userId);
      if (coringaApplied) setWcCoringaUsedOn(todaySaoPaulo());
    }

    // Coringa do Azarão: só vale no bolão E se houver algum palpite qualificável de azarão
    let underdogCoringaApplied = false;
    const bestUnderdog = findUnderdogPick(betSlip, matches);
    if (useUnderdogCoringa && isWcBet && bestUnderdog && wcUnderdogCoringaAvailable) {
      underdogCoringaApplied = await useWcUnderdogCoringa(userId);
      if (underdogCoringaApplied) {
        setWcUnderdogCoringaUsedOn(todaySaoPaulo());
      }
    }

    // Ajusta o slip multiplicando a odd do azarão por 1.5 se o Coringa do Azarão foi ativado
    const finalSlip = betSlip.map(item => {
      if (underdogCoringaApplied && bestUnderdog && item.matchId === bestUnderdog.matchId && item.oddType === bestUnderdog.oddType) {
        return { ...item, oddValue: Number((item.oddValue * 1.5).toFixed(2)) };
      }
      return item;
    });

    const totalOdds = computeTotalOdds(finalSlip, matches);
    const enrichedPicks = finalSlip.map(item => {
      const match = matches.find(m => m.id === item.matchId);
      const isBoosted = underdogCoringaApplied && bestUnderdog && item.matchId === bestUnderdog.matchId && item.oddType === bestUnderdog.oddType;
      return {
        ...item,
        homeTeam: match?.homeTeam || item.homeTeam,
        awayTeam: match?.awayTeam || item.awayTeam,
        homeLogo: match?.homeLogo || item.homeLogo,
        awayLogo: match?.awayLogo || item.awayLogo,
        ...(isBoosted ? { underdogBoosted: true } : {})
      };
    });

    // Lucro bonificado (só no bolão): a sequência de acertos e o coringa
    // multiplicam o LUCRO, não a aposta. A perda continua sendo só o valor apostado.
    const baseProfit = amount * totalOdds - amount;
    const profitMult = isWcBet
      ? Math.pow(STREAK_PROFIT_STEP, wcStreak) * (coringaApplied ? CORINGA_PROFIT_FACTOR : 1)
      : 1;

    const newBet: PlacedBet = {
      id: Math.random().toString(36).substring(2, 9),
      amount,
      picks: enrichedPicks,
      totalOdds,
      potentialReturn: amount + baseProfit * profitMult,
      status: "pending",
      isWcBet,
      userNotified: false,
      coringa: coringaApplied,
      underdogCoringa: underdogCoringaApplied,
    };

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
      coringa: newBet.coringa,
      underdog_coringa: newBet.underdogCoringa,
    });
  };

  const placeWinnerBet = async (teamName: string, teamLogo: string, oddValue: number, amount: number): Promise<boolean> => {
    if (!userId || amount <= 0) return false;

    const winnerDeadline = new Date("2026-07-15T23:59:59-04:00");
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
    setWcCoringaUsedOn(null);
    setWcUnderdogCoringaUsedOn(null);
    if (userId) {
      supabase.from("netano_profiles").update({ balance: 1000, wc_joined: false, wc_balance: 1000.00, wc_coringa_used_on: null, wc_underdog_coringa_used_on: null }).eq("id", userId);
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
        wcJoined, wcBalance, wcCoringaAvailable, wcUnderdogCoringaAvailable,
        wcCoringaUsedOn, wcUnderdogCoringaUsedOn,
        wcStreak, wcBestStreak, joinWcCompetition, placeWinnerBet,
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
