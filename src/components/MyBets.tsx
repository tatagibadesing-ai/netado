"use client";

import React from "react";
import { useBet } from "../context/BetContext";
import { CheckCircle2, XCircle, Clock, CheckCircle, Trash2 } from "lucide-react";
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
        <div className="bg-[#121212] p-8 text-center text-slate-500">
          Você ainda não fez nenhuma aposta.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {placedBets.map((bet) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#121212] p-5 flex flex-col gap-4"
              >
                {/* Bet Header */}
                <div className="flex justify-between items-center pb-3">
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
                    const homeTeam = pick.homeTeam || match?.homeTeam || "Time Casa";
                    const awayTeam = pick.awayTeam || match?.awayTeam || "Time Fora";
                    const homeLogo = pick.homeLogo || match?.homeLogo;
                    const awayLogo = pick.awayLogo || match?.awayLogo;
                    
                    let pickResult: boolean | null = null;
                    if (match) {
                      // Se a partida foi encontrada, checamos o status da aposta individual
                      // Importante usar a função isPickWon exportada do BetContext
                      // Como não importamos diretamente aqui, vamos checar manualmente ou via context se possível, mas como a função isPickWon foi exportada de BetContext.tsx:
                      const { isPickWon } = require("../context/BetContext");
                      pickResult = isPickWon(pick, match);
                    } else if (bet.status === "lost") {
                      // Fallback: se a partida não foi encontrada e a aposta geral está perdida, não sabemos qual pick falhou exatamente
                    }

                    return (
                      <div key={i} className="flex flex-col gap-3 bg-[#080808] p-4 rounded-lg relative overflow-hidden">
                        {/* Indicador de Acerto / Erro na Borda */}
                        {pickResult === true && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                        {pickResult === false && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                        
                        {/* Cabecalho do Jogo e Logos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {homeLogo ? (
                                <img src={homeLogo} alt="" className="w-5 h-5 object-contain" />
                              ) : (
                                <div className="w-5 h-5 bg-[#1a1a1a] rounded-full" />
                              )}
                              <span className="text-sm font-semibold text-white">{homeTeam}</span>
                            </div>
                            <span className="text-slate-600 text-xs font-black">X</span>
                            <div className="flex items-center gap-2">
                              {awayLogo ? (
                                <img src={awayLogo} alt="" className="w-5 h-5 object-contain" />
                              ) : (
                                <div className="w-5 h-5 bg-[#1a1a1a] rounded-full" />
                              )}
                              <span className="text-sm font-semibold text-white">{awayTeam}</span>
                            </div>
                          </div>

                          {/* Placar Final */}
                          {match?.isFinished && (
                            <div className="bg-[#1a1a1a] px-2 py-0.5 rounded font-bold text-sm text-[#FF3C00]">
                              {match.homeScore} - {match.awayScore}
                            </div>
                          )}
                        </div>

                        {/* Detalhes da Odd e Resultado */}
                        <div className="flex justify-between items-center bg-[#121212] p-2 rounded">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sua Aposta</span>
                            <span className="font-bold text-slate-200">{getOddLabel(pick.oddType)}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {pickResult === true && <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ACERTOU</span>}
                            {pickResult === false && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> ERROU</span>}
                            {pickResult === null && match?.isFinished === false && <span className="text-xs font-bold text-slate-500">PENDENTE</span>}
                            
                            <span className="font-black text-[#FF3C00] text-lg bg-[#080808] px-2 py-0.5 rounded">
                              {pick.oddValue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bet Footer */}
                <div className="flex items-center justify-between pt-3">
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
