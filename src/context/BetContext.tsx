"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Match, OddType, initialMatches } from "../data/matches";

export interface SlipItem {
  matchId: string;
  oddType: OddType;
  oddValue: number;
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
  balance: number;
  matches: Match[];
  isLoadingMatches: boolean;
  betSlip: SlipItem[];
  placedBets: PlacedBet[];
  addToSlip: (matchId: string, oddType: OddType, oddValue: number) => void;
  removeFromSlip: (matchId: string, oddType: OddType) => void;
  clearSlip: () => void;
  placeBet: (amount: number) => void;
  resetAll: () => void;
  refreshMatches: () => void;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

const isPickWon = (pick: SlipItem, match: Match): boolean | null => {
  if (!match.isFinished) return null; // Pending
  
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
  const [balance, setBalance] = useState<number>(1000.0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
  const [betSlip, setBetSlip] = useState<SlipItem[]>([]);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedBalance = localStorage.getItem("bet_balance");
      const savedSlip = localStorage.getItem("bet_slip");
      const savedBets = localStorage.getItem("bet_placed");

      if (savedBalance) setBalance(parseFloat(savedBalance));
      if (savedSlip) setBetSlip(JSON.parse(savedSlip));
      if (savedBets) setPlacedBets(JSON.parse(savedBets));
    } catch (e) {
      console.error("Error loading state from localStorage", e);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("bet_balance", balance.toString());
      localStorage.setItem("bet_slip", JSON.stringify(betSlip));
      localStorage.setItem("bet_placed", JSON.stringify(placedBets));
    }
  }, [balance, betSlip, placedBets, isInitialized]);

  const evaluateBets = (currentMatches: Match[]) => {
    setPlacedBets((prevBets) => {
      let winnings = 0;
      let stateChanged = false;
      const newBets = prevBets.map((bet) => {
        if (bet.status !== "pending") return bet;

        let won = true;
        let isPending = false;
        let hasLostPick = false;

        for (const pick of bet.picks) {
          const match = currentMatches.find(m => m.id === pick.matchId);
          if (!match) continue; // Should not happen, but assume pending if match not found

          const pickResult = isPickWon(pick, match);
          
          if (pickResult === null) {
            isPending = true;
          } else if (pickResult === false) {
            hasLostPick = true;
            break;
          }
        }

        if (hasLostPick) {
            stateChanged = true;
            return { ...bet, status: "lost" as const };
        }

        if (!isPending) {
            winnings += bet.potentialReturn;
            stateChanged = true;
            return { ...bet, status: "won" as const };
        }

        return bet;
      });

      if (stateChanged) {
          if (winnings > 0) {
            setBalance((prev) => prev + winnings);
          }
          return newBets;
      }
      return prevBets;
    });
  };

  const fetchMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      if (data && data.length > 0) {
        setMatches(data);
        evaluateBets(data);
      } else {
        setMatches(initialMatches); // Fallback
        evaluateBets(initialMatches);
      }
    } catch (err) {
      console.error("Erro ao buscar jogos reais:", err);
      setMatches(initialMatches); // Fallback
      evaluateBets(initialMatches);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
        fetchMatches();
    }
  }, [isInitialized]);

  const addToSlip = (matchId: string, oddType: OddType, oddValue: number) => {
    setBetSlip((prev) => {
      // Remove the EXACT pick if it exists so we don't duplicate, but allow other picks from the same match
      const filtered = prev.filter((item) => !(item.matchId === matchId && item.oddType === oddType));
      return [...filtered, { matchId, oddType, oddValue }];
    });
  };

  const removeFromSlip = (matchId: string, oddType: OddType) => {
    setBetSlip((prev) => prev.filter((item) => !(item.matchId === matchId && item.oddType === oddType)));
  };

  const clearSlip = () => {
    setBetSlip([]);
  };

  const placeBet = (amount: number) => {
    if (amount <= 0 || amount > balance || betSlip.length === 0) return;

    const totalOdds = betSlip.reduce((acc, item) => acc * item.oddValue, 1);
    const newBet: PlacedBet = {
      id: Math.random().toString(36).substring(2, 9),
      amount,
      picks: [...betSlip],
      totalOdds,
      potentialReturn: amount * totalOdds,
      status: "pending",
    };

    setBalance((prev) => prev - amount);
    setPlacedBets((prev) => [newBet, ...prev]);
    setBetSlip([]);
  };

  const resetAll = () => {
    setBalance(1000);
    setMatches(initialMatches);
    setBetSlip([]);
    setPlacedBets([]);
    fetchMatches();
  };

  return (
    <BetContext.Provider
      value={{
        balance,
        matches,
        isLoadingMatches,
        betSlip,
        placedBets,
        addToSlip,
        removeFromSlip,
        clearSlip,
        placeBet,
        resetAll,
        refreshMatches: fetchMatches,
      }}
    >
      {children}
    </BetContext.Provider>
  );
}

export function useBet() {
  const context = useContext(BetContext);
  if (!context) {
    throw new Error("useBet must be used within a BetProvider");
  }
  return context;
}
