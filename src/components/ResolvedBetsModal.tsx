"use client";

import React, { useState, useEffect } from "react";
import { useBet } from "../context/BetContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Award, X } from "lucide-react";
import { OddType } from "../data/matches";

interface PlacedBet {
  id: string;
  amount: number;
  picks: any[];
  totalOdds: number;
  potentialReturn: number;
  status: "pending" | "won" | "lost" | "cancelled";
  isWcBet?: boolean;
  userNotified?: boolean;
}

export function ResolvedBetsModal() {
  const { placedBets, userId, markBetsAsNotified } = useBet();
  const [unseenBets, setUnseenBets] = useState<PlacedBet[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!userId || placedBets.length === 0) return;

    // Filtra apenas as apostas resolvidas que não foram vistas ainda no banco
    const unseen = (placedBets as PlacedBet[]).filter(
      (bet) => (bet.status === "won" || bet.status === "lost") && !bet.userNotified
    );

    if (unseen.length > 0) {
      setUnseenBets(unseen);
      if (!isOpen) {
        setCurrentIndex(0);
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
      setUnseenBets([]);
    }
  }, [placedBets, userId, isOpen]);

  if (!isOpen || unseenBets.length === 0) return null;

  const currentBet = unseenBets[currentIndex];
  const isWin = currentBet.status === "won";
  const isLast = currentIndex === unseenBets.length - 1;

  const handleClose = async () => {
    const ids = unseenBets.map((b) => b.id);
    await markBetsAsNotified(ids);
    setIsOpen(false);
    setUnseenBets([]);
  };

  const handleNext = () => {
    if (currentIndex < unseenBets.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getOddLabel = (type: OddType) => {
    switch (type) {
      case "home": return "Casa (1)";
      case "draw": return "Empate (X)";
      case "away": return "Fora (2)";
      case "over05": return "Mais de 0.5 Gols";
      case "under05": return "Menos de 0.5 Gols";
      case "over15": return "Mais de 1.5 Gols";
      case "under15": return "Menos de 1.5 Gols";
      case "over25": return "Mais de 2.5 Gols";
      case "under25": return "Menos de 2.5 Gols";
      case "over35": return "Mais de 3.5 Gols";
      case "under35": return "Menos de 3.5 Gols";
      case "over45": return "Mais de 4.5 Gols";
      case "under45": return "Menos de 4.5 Gols";
      case "bttsYes": return "Ambas Marcam: Sim";
      case "bttsNo": return "Ambas Marcam: Não";
      case "dc1x": return "Chance Dupla: 1X";
      case "dcx2": return "Chance Dupla: X2";
      case "dc12": return "Chance Dupla: 12";
      default: return type;
    }
  };

  const getPickResult = (pick: any) => {
    const h = pick.finalHomeScore ?? 0;
    const a = pick.finalAwayScore ?? 0;
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px]">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolved-bets-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-[#121212] p-6 sm:p-8 border border-white/5 shadow-2xl"
      >
        {/* Botão Fechar X */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5 z-20 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Textura da Copa no topo */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-95"
          style={{
            backgroundImage: "url('/svgpartedacopa.svg')",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(18, 18, 18, 0.35) 48%, #121212 88%)",
          }}
        />

        <div className="relative z-10 pt-10 text-center flex flex-col items-center">
          <h2 id="resolved-bets-title" className="mb-1 text-2xl font-bold tracking-tight text-white">
            {isWin ? "Você Ganhou!" : "Fim de Jogo"}
          </h2>
          <p className="px-2 text-sm font-medium leading-relaxed text-slate-300">
            {isWin 
              ? `Sua aposta foi resolvida. Parabéns pelo retorno!` 
              : `Seu palpite foi finalizado. Não desanime, o próximo pode ser o vencedor!`
            }
          </p>
        </div>

        {/* Carousel Content */}
        <div className="relative z-10 mt-6 bg-black/45 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
          <div className="flex justify-end text-xs text-slate-400 font-sans">
            <span>
              {currentBet.isWcBet ? "Bolão da Copa" : "Aposta Esportiva"}
            </span>
          </div>

          {/* Picks list */}
          <div className="flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {currentBet.picks.map((pick, idx) => {
              const pickWon = getPickResult(pick);
              return (
                <div key={idx} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">
                      {pick.homeTeam} x {pick.awayTeam}
                    </span>
                    <span className="font-black text-[#FF3C00]">
                      {pick.finalHomeScore} - {pick.finalAwayScore}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Sua Aposta: {getOddLabel(pick.oddType)}
                    </span>
                    <span className={`font-bold ${pickWon ? "text-green-400" : "text-red-400"}`}>
                      {pickWon ? "ACERTOU" : "ERROU"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bet Summary */}
          <div className="flex justify-between items-center border-t border-white/5 pt-3 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Apostado</span>
              <span className="font-bold text-slate-300">R$ {currentBet.amount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Odds</span>
              <span className="font-bold text-slate-300">{currentBet.totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase">
                {isWin ? "Valor Ganho" : "Retorno Potencial"}
              </span>
              <span className={`font-black text-base ${isWin ? "text-[#FF3C00]" : "text-slate-400"}`}>
                R$ {isWin ? currentBet.potentialReturn.toFixed(2) : "0.00"}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Navigation (if more than 1 bet resolved) */}
        {unseenBets.length > 1 && (
          <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none p-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="font-sans">
              {currentIndex + 1} de {unseenBets.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === unseenBets.length - 1}
              className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none p-1 cursor-pointer"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={isLast ? handleClose : handleNext}
          className="relative z-10 mt-6 w-full rounded-xl bg-[#FF3C00] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#FF3C00]/20 transition-all hover:bg-[#FF5722] active:scale-[0.98] cursor-pointer"
        >
          {isLast ? "Entendido" : "Ver Próxima Aposta"}
        </button>
      </motion.div>
    </div>
  );
}
