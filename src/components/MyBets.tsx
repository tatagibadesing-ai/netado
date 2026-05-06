"use client";

import React from "react";
import { useBet } from "../context/BetContext";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { OddType } from "../data/matches";
import { motion, AnimatePresence } from "framer-motion";

export function MyBets() {
  const { placedBets, matches } = useBet();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won": return <CheckCircle2 className="w-5 h-5 text-[#FF3C00]" />;
      case "lost": return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Minhas Apostas</h2>
      </div>

      {placedBets.length === 0 ? (
        <div className="bg-[#121212] border border-[#1a1a1a] rounded-xl p-8 text-center text-slate-500">
          Você ainda não fez nenhuma aposta.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {placedBets.map((bet) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121212] border border-[#1a1a1a] rounded-xl p-5 flex flex-col gap-4"
              >
                {/* Bet Header */}
                <div className="flex justify-between items-center border-b border-[#080808] pb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(bet.status)}
                    <span className="font-bold text-lg uppercase tracking-wide">
                      {bet.status === "pending" && "Pendente"}
                      {bet.status === "won" && <span className="text-[#FF3C00]">Ganha</span>}
                      {bet.status === "lost" && <span className="text-red-500">Perdida</span>}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono bg-[#080808] px-2 py-1 rounded">
                    ID: {bet.id}
                  </span>
                </div>

                {/* Picks */}
                <div className="flex flex-col gap-3">
                  {bet.picks.map((pick, i) => {
                    const match = matches.find((m) => m.id === pick.matchId);
                    return (
                      <div key={i} className="flex flex-col gap-2 bg-[#080808] p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                          {match ? (
                            <>
                              {match.homeLogo ? <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain" /> : null}
                              <span>{match.homeTeam}</span>
                              <span className="text-slate-600">vs</span>
                              <span>{match.awayTeam}</span>
                              {match.awayLogo ? <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain" /> : null}
                            </>
                          ) : (
                            "Carregando partida..."
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-200">{getOddLabel(pick.oddType)}</span>
                          <span className="font-bold text-[#FF3C00]">{pick.oddValue.toFixed(2)}</span>
                        </div>
                        {match?.isFinished && (
                          <div className="text-xs mt-1 border-t border-[#121212] pt-2">
                            Placar final: <span className="font-bold text-[#FF3C00]">{match.homeScore} - {match.awayScore}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bet Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#080808]">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Valor Apostado</span>
                    <span className="font-bold">R$ {bet.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500">Retorno Potencial</span>
                    <span className={`font-bold text-lg ${bet.status === 'won' ? 'text-[#FF3C00]' : ''}`}>
                      R$ {bet.potentialReturn.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
