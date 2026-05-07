"use client";

import React, { useState, useEffect } from "react";
import { useBet } from "../context/BetContext";
import { Trash2, AlertCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { OddType } from "../data/matches";
import { motion, AnimatePresence } from "framer-motion";

export function BetSlip() {
  const { betSlip, matches, balance, removeFromSlip, clearSlip, placeBet } = useBet();
  const [betAmount, setBetAmount] = useState<number | "">("");
  const [isOpen, setIsOpen] = useState(false);

  // Automatically open the slip when the first item is added
  useEffect(() => {
    if (betSlip.length === 1) {
      setIsOpen(true);
    }
  }, [betSlip.length]);

  const totalOdds = betSlip.reduce((acc, item) => acc * item.oddValue, 1);
  const potentialReturn = (Number(betAmount) || 0) * totalOdds;
  const isSufficientBalance = (Number(betAmount) || 0) <= balance;
  const isValidBet = betSlip.length > 0 && Number(betAmount) > 0 && isSufficientBalance;

  const handlePlaceBet = () => {
    if (isValidBet) {
      placeBet(Number(betAmount));
      setBetAmount("");
      setIsOpen(false);
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
                      <p className="text-xs font-semibold text-slate-500 mb-1 line-clamp-1">
                        {match?.homeTeam} vs {match?.awayTeam}
                      </p>
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
                <span className="text-slate-400">Retorno Potencial</span>
                <span className="font-bold text-[#FF3C00]">
                  R$ {potentialReturn.toFixed(2)}
                </span>
              </div>

              {betAmount !== "" && !isSufficientBalance && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  Saldo insuficiente (Disponível: R$ {balance.toFixed(2)})
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
