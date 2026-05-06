"use client";

import React, { useState } from "react";
import { useBet } from "../context/BetContext";
import { Trash2, TrendingUp, AlertCircle } from "lucide-react";
import { OddType } from "../data/matches";

export function BetSlip() {
  const { betSlip, matches, balance, removeFromSlip, clearSlip, placeBet } = useBet();
  const [betAmount, setBetAmount] = useState<number | "">("");

  const totalOdds = betSlip.reduce((acc, item) => acc * item.oddValue, 1);
  const potentialReturn = (Number(betAmount) || 0) * totalOdds;
  const isSufficientBalance = (Number(betAmount) || 0) <= balance;
  const isValidBet = betSlip.length > 0 && Number(betAmount) > 0 && isSufficientBalance;

  const handlePlaceBet = () => {
    if (isValidBet) {
      placeBet(Number(betAmount));
      setBetAmount("");
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

  if (betSlip.length === 0) {
    return (
      <div className="bg-[#121212] border border-[#1a1a1a] rounded-xl p-6 flex flex-col items-center justify-center text-center h-[300px]">
        <div className="w-16 h-16 bg-[#080808] rounded-full flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-slate-400 font-medium">Seu cupom está vazio</p>
        <p className="text-sm text-slate-500 mt-2">Selecione uma aposta para começar</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-[#1a1a1a] rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-[#080808] p-4 flex items-center justify-between border-b border-[#1a1a1a]">
        <h3 className="font-bold flex items-center gap-2">
          Cupom de Apostas
          <span className="bg-[#FF3C00] text-black font-bold text-xs px-2 py-0.5 rounded-full">
            {betSlip.length}
          </span>
        </h3>
        <button
          onClick={clearSlip}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* Selections */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {betSlip.map((item, index) => {
          const match = matches.find((m) => m.id === item.matchId);
          return (
            <div key={index} className="bg-[#080808] p-3 rounded-lg relative group">
              <button
                onClick={() => removeFromSlip(item.matchId, item.oddType)}
                className="absolute top-3 right-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="pr-6">
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
      <div className="bg-[#080808] p-4 flex flex-col gap-4 border-t border-[#1a1a1a]">
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
            className="w-full bg-[#121212] border border-[#1a1a1a] focus:border-[#FF3C00] rounded-lg px-4 py-3 text-lg font-bold outline-none transition-colors"
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
          className="w-full bg-[#FF3C00] hover:bg-[#FF3C00]/80 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black py-4 rounded-lg transition-colors mt-2"
        >
          APOSTE JÁ
        </button>
      </div>
    </div>
  );
}
