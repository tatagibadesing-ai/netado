"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useBet, STREAK_PROFIT_STEP, CORINGA_PROFIT_FACTOR } from "../context/BetContext";
import { Trash2, AlertCircle, ChevronDown, ChevronUp, FileText, Sparkles, Flame, Zap } from "lucide-react";
import { computeTotalOdds, getOddLabel, findUnderdogPick } from "../lib/odds";
import { motion, AnimatePresence } from "framer-motion";

export function BetSlip() {
  const {
    betSlip,
    matches,
    balance,
    removeFromSlip,
    clearSlip,
    placeBet,
    wcJoined,
    wcBalance,
    wcCoringaAvailable,
    wcUnderdogCoringaAvailable,
    wcStreak
  } = useBet();
  const [betAmount, setBetAmount] = useState<number | "">("");
  const [isOpen, setIsOpen] = useState(false);
  const [useCoringa, setUseCoringa] = useState(false);
  const [useUnderdogCoringa, setUseUnderdogCoringa] = useState(false);

  // Automatically open the slip when the first item is added
  useEffect(() => {
    if (betSlip.length === 1) {
      setIsOpen(true);
    }
  }, [betSlip.length]);

  const allMatchesWc = betSlip.every(item => {
    const match = matches.find(m => m.id === item.matchId);
    return match?.league?.toLowerCase() === "copa do mundo";
  });

  const hasStartedMatches = betSlip.some(item => {
    const match = matches.find(m => m.id === item.matchId);
    return match ? (match.isLive || match.isFinished || match.time === "FINALIZADO") : false;
  });

  const isWcBet = wcJoined && allMatchesWc;
  
  // Coringa só vale no "Jogo do Coringa" do dia (todas as seleções marcadas).
  const coringaEligible = isWcBet && betSlip.length > 0 &&
    betSlip.every((item) => matches.find((m) => m.id === item.matchId)?.isCoringaGame);
  const coringaActive = coringaEligible && wcCoringaAvailable && useCoringa;

  // Coringa do Azarão: vale se houver um palpite qualificável de azarão no bolão
  const underdogPick = findUnderdogPick(betSlip, matches);
  const underdogCoringaEligible = isWcBet && !!underdogPick;
  const underdogCoringaActive = underdogCoringaEligible && wcUnderdogCoringaAvailable && useUnderdogCoringa;

  // Ajusta o slip temporariamente para cálculo de odds/retorno se o Coringa do Azarão for ativado
  const adjustedSlip = useMemo(() => {
    if (!underdogCoringaActive || !underdogPick) return betSlip;
    return betSlip.map(item => {
      if (item.matchId === underdogPick.matchId && item.oddType === underdogPick.oddType) {
        return { ...item, oddValue: Number((item.oddValue * 1.5).toFixed(2)) };
      }
      return item;
    });
  }, [betSlip, underdogCoringaActive, underdogPick]);

  const totalOdds = computeTotalOdds(adjustedSlip, matches);

  // Lucro bonificado no bolão: ofensiva (streak) e coringa multiplicam o LUCRO.
  const stake = Number(betAmount) || 0;
  const baseProfit = Math.max(0, stake * totalOdds - stake);
  const streakMult = isWcBet ? Math.pow(STREAK_PROFIT_STEP, wcStreak) : 1;
  const coringaMult = coringaActive ? CORINGA_PROFIT_FACTOR : 1;
  const potentialReturn = isWcBet ? stake + baseProfit * streakMult * coringaMult : stake * totalOdds;
  const activeBalance = isWcBet ? wcBalance : balance;
  const isSufficientBalance = (Number(betAmount) || 0) <= activeBalance;
  const isWithinWcLimit = !isWcBet || (Number(betAmount) || 0) <= wcBalance * 0.75;
  const isValidBet = betSlip.length > 0 && Number(betAmount) > 0 && isSufficientBalance && isWithinWcLimit && !hasStartedMatches;

  const handlePlaceBet = () => {
    if (isValidBet) {
      placeBet(Number(betAmount), coringaActive, underdogCoringaActive);
      setBetAmount("");
      setUseCoringa(false);
      setUseUnderdogCoringa(false);
      setIsOpen(false);
    }
  };

  // Do not render anything if slip is empty
  if (betSlip.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 left-0 md:left-auto md:bottom-6 md:right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#121212] flex flex-col overflow-hidden w-full md:w-[380px] md:mb-4 rounded-t-2xl md:rounded-xl pointer-events-auto border-t md:border border-[#1a1a1a] md:border-none"
          >
            {/* Header */}
            <div className="bg-[#080808] p-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                Cupom de Apostas
                <span className="bg-[#FF3C00] text-black font-bold text-xs px-2 py-0.5 rounded-full">
                  {betSlip.length}
                </span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearSlip}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-2 -mr-2"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selections */}
            <div className="max-h-[50vh] md:max-h-[350px] overflow-y-auto p-4 flex flex-col gap-3">
              {betSlip.map((item, index) => {
                const match = matches.find((m) => m.id === item.matchId);
                return (
                  <div key={index} className="bg-[#080808] p-3 rounded-lg relative group">
                    <button
                      onClick={() => removeFromSlip(item.matchId, item.oddType)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 opacity-100 transition-opacity p-2 -mt-2 -mr-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="pr-8">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                          {match?.homeTeam} vs {match?.awayTeam}
                        </p>
                        {match && (match.isLive || match.isFinished || match.time === "FINALIZADO") && (
                          <span className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1 py-0.2 rounded shrink-0">
                            {match.time === "FINALIZADO" ? "ENCERRADO" : "AO VIVO"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-white">
                          {getOddLabel(item.oddType)}
                        </span>
                        <span className="font-bold text-[#FF3C00]">
                          {item.oddValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Summary */}
            <div className="bg-[#080808] p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Odd Total (Múltipla)</span>
                <span className="font-bold text-lg text-[#FF3C00]">
                  {totalOdds.toFixed(2)}
                </span>
              </div>

              {wcJoined && allMatchesWc && (
                <div className="bg-[#121212] p-3 rounded-lg flex flex-col gap-2">
                  <span className="text-xs font-bold text-white">
                    Aposta do Bolão da Copa (Automática)
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Saldo do Bolão: <span className="font-bold text-[#FF3C00]">R$ {wcBalance.toFixed(2)}</span> (Max aposta: R$ {(wcBalance * 0.75).toFixed(2)})
                  </p>

                  {/* Bônus de ofensiva (streak): já embutido no retorno. */}
                  {wcStreak > 0 && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      Ofensiva de {wcStreak} — +{Math.round((streakMult - 1) * 100)}% de lucro
                    </span>
                  )}

                  {/* Coringa Tradicional: 1 a cada 3 dias, só no Jogo do Coringa, 1.5x de lucro. */}
                  {coringaEligible && wcCoringaAvailable ? (
                    <button
                      type="button"
                      onClick={() => setUseCoringa((v) => !v)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                        useCoringa ? "bg-[#FF3C00]/15" : "bg-[#080808] hover:bg-[#161616]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 shrink-0 ${useCoringa ? "text-[#FF3C00]" : "text-slate-400"}`} />
                        <span className="flex flex-col">
                          <span className="text-xs font-bold text-white">Usar Coringa (3 dias)</span>
                          <span className="text-[10px] text-slate-400">Lucro 1.5x no Jogo do Coringa</span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
                          useCoringa ? "bg-[#FF3C00]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            useCoringa ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  ) : coringaEligible ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" /> Coringa em cooldown (1 uso a cada 3 dias).
                    </span>
                  ) : wcCoringaAvailable ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" /> Coringa disponível para o Jogo do Coringa do dia.
                    </span>
                  ) : null}

                  {/* Coringa do Azarão: 1 por dia, 1.5x na odd da seleção azarão */}
                  {underdogCoringaEligible && wcUnderdogCoringaAvailable ? (
                    <button
                      type="button"
                      onClick={() => setUseUnderdogCoringa((v) => !v)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer mt-2 ${
                        useUnderdogCoringa ? "bg-[#FF9D00]/15" : "bg-[#080808] hover:bg-[#161616]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 shrink-0 ${useUnderdogCoringa ? "text-[#FF9D00]" : "text-slate-400"}`} />
                        <span className="flex flex-col">
                          <span className="text-xs font-bold text-white">Usar Coringa do Azarão</span>
                          <span className="text-[10px] text-slate-400">Odd 1.5x no time azarão</span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
                          useUnderdogCoringa ? "bg-[#FF9D00]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            useUnderdogCoringa ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  ) : underdogCoringaEligible ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-2">
                      <Zap className="w-3.5 h-3.5 shrink-0" /> Coringa do Azarão já usado hoje — volta amanhã.
                    </span>
                  ) : wcUnderdogCoringaAvailable ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-2">
                      <Zap className="w-3.5 h-3.5 shrink-0" /> Coringa do Azarão disponível (aposte em um time azarão).
                    </span>
                  ) : null}
                </div>
              )}

              {wcJoined && !allMatchesWc && betSlip.some(item => matches.find(m => m.id === item.matchId)?.league?.toLowerCase() === "copa do mundo") && (
                <div className="bg-[#121212] p-3 rounded-lg flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400">
                    Aposta do Bolão da Copa
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium leading-normal">
                    Para apostar pelo Bolão, remova os jogos de outras competições do cupom.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400">Valor da Aposta (R$)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="w-full bg-[#121212] focus:border-[#FF3C00] rounded-lg px-4 py-3 text-lg font-bold outline-none transition-colors"
                />
              </div>

              <div className="flex justify-between items-center text-sm py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  Retorno Potencial
                  {coringaActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#FF3C00] bg-[#FF3C00]/15 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-3 h-3" /> 1.5x
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#FF3C00]">
                  R$ {potentialReturn.toFixed(2)}
                </span>
              </div>

              {betAmount !== "" && !isSufficientBalance && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {isWcBet 
                    ? `Saldo insuficiente do bolão (Disponível: R$ ${wcBalance.toFixed(2)})`
                    : `Saldo insuficiente (Disponível: R$ ${balance.toFixed(2)})`
                  }
                </div>
              )}

              {betAmount !== "" && isSufficientBalance && !isWithinWcLimit && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  O valor excede o limite de 75% do saldo do bolão (Máximo: R$ {(wcBalance * 0.75).toFixed(2)})
                </div>
              )}

              {hasStartedMatches && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Não é permitido apostar em partidas em andamento ou encerradas.</span>
                </div>
              )}

              <button
                onClick={handlePlaceBet}
                disabled={!isValidBet}
                className="w-full bg-[#FF3C00] hover:bg-[#FF3C00]/80 disabled:bg-[#1a1a1a] disabled:text-slate-600 text-black font-bold py-4 rounded-lg transition-colors mt-2 mb-2 md:mb-0"
              >
                APOSTE JÁ
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="bg-[#FF3C00] hover:bg-[#ff5522] text-black rounded-full px-5 py-3 flex items-center gap-3 transition-colors mb-4 mr-4 md:mb-0 md:mr-0 pointer-events-auto"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <FileText className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {betSlip.length}
                </span>
              </div>
              <span className="font-bold text-lg">{totalOdds.toFixed(2)}</span>
            </div>
            <ChevronUp className="w-5 h-5 ml-2 opacity-80" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
