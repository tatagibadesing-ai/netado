"use client";

import React, { useState } from "react";
import { Match, OddType } from "../data/matches";
import { useBet } from "../context/BetContext";
import { ChevronDown, ChevronUp } from "lucide-react";

export function MatchCard({ match }: { match: Match }) {
  const { betSlip, addToSlip, removeFromSlip } = useBet();
  const [expanded, setExpanded] = useState(false);

  const isSelected = (oddType: OddType) => {
    return betSlip.some((item) => item.matchId === match.id && item.oddType === oddType);
  };

  const handleSelect = (oddType: OddType, value: number) => {
    if (isSelected(oddType)) {
      removeFromSlip(match.id, oddType);
    } else {
      addToSlip(match.id, oddType, value);
    }
  };

  const isFinished = match.time === "FINALIZADO";

  const OddButton = ({ type, value, label }: { type: OddType, value: number | undefined, label: string }) => {
    if (!value) return null;
    const selected = isSelected(type);
    return (
      <button
        onClick={() => handleSelect(type, value)}
        disabled={isFinished}
        className={`flex items-center justify-between px-3 py-2 rounded flex-1 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          selected
            ? "bg-[#FF3C00] text-black"
            : "bg-[#080808] text-slate-300 hover:bg-[#1a1a1a]"
        }`}
      >
        <span className={`font-normal opacity-80 ${selected ? "text-black" : ""}`}>{label}</span>
        <span>{value.toFixed(2)}</span>
      </button>
    );
  };

  return (
    <div className="bg-[#121212] rounded-xl flex flex-col p-4 w-full border border-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-400 font-medium tracking-wide">
          {match.league} • {match.time}
        </span>
        {isFinished && (
          <span className="text-xs font-bold text-[#FF3C00] bg-[#FF3C00]/10 px-2 py-0.5 rounded">
            ENCERRADO
          </span>
        )}
      </div>

      {/* Teams and Score (if finished) */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-3">
          {match.homeLogo ? (
            <img src={match.homeLogo} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 bg-slate-800 rounded-full" />
          )}
          <span className="font-semibold text-slate-100">{match.homeTeam} {isFinished && <span className="ml-2 font-bold text-[#FF3C00]">{match.homeScore}</span>}</span>
        </div>
        <div className="flex items-center gap-3">
          {match.awayLogo ? (
            <img src={match.awayLogo} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 bg-slate-800 rounded-full" />
          )}
          <span className="font-semibold text-slate-100">{match.awayTeam} {isFinished && <span className="ml-2 font-bold text-[#FF3C00]">{match.awayScore}</span>}</span>
        </div>
      </div>

      {/* Main Odds (1X2) */}
      <div className="flex gap-2">
        <OddButton type="home" value={match.odds.home} label="1" />
        <OddButton type="draw" value={match.odds.draw} label="X" />
        <OddButton type="away" value={match.odds.away} label="2" />
      </div>

      {/* Expander */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-semibold text-slate-500 hover:text-white flex items-center justify-center gap-1 py-1"
      >
        {expanded ? "Menos mercados" : "Mais mercados"} 
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Extended Markets */}
      {expanded && (
        <div className="mt-3 flex flex-col gap-4 border-t border-[#1a1a1a] pt-4">
          
          {/* Over / Under */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-500 font-medium">Total de Gols (Adicional)</span>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <OddButton type="over05" value={match.odds.over05} label="Mais de 0.5" />
                <OddButton type="under05" value={match.odds.under05} label="Menos de 0.5" />
              </div>
              <div className="flex gap-2">
                <OddButton type="over15" value={match.odds.over15} label="Mais de 1.5" />
                <OddButton type="under15" value={match.odds.under15} label="Menos de 1.5" />
              </div>
              <div className="flex gap-2">
                <OddButton type="over25" value={match.odds.over25} label="Mais de 2.5" />
                <OddButton type="under25" value={match.odds.under25} label="Menos de 2.5" />
              </div>
              <div className="flex gap-2">
                <OddButton type="over35" value={match.odds.over35} label="Mais de 3.5" />
                <OddButton type="under35" value={match.odds.under35} label="Menos de 3.5" />
              </div>
              <div className="flex gap-2">
                <OddButton type="over45" value={match.odds.over45} label="Mais de 4.5" />
                <OddButton type="under45" value={match.odds.under45} label="Menos de 4.5" />
              </div>
            </div>
          </div>

          {/* BTTS */}
          <div className="flex flex-col gap-2 border-t border-[#1a1a1a] pt-2">
            <span className="text-xs text-slate-500 font-medium">Ambas Equipes Marcam</span>
            <div className="flex gap-2">
              <OddButton type="bttsYes" value={match.odds.bttsYes} label="Sim" />
              <OddButton type="bttsNo" value={match.odds.bttsNo} label="Não" />
            </div>
          </div>

          {/* Double Chance */}
          <div className="flex flex-col gap-2 border-t border-[#1a1a1a] pt-2">
            <span className="text-xs text-slate-500 font-medium">Chance Dupla</span>
            <div className="flex gap-2">
              <OddButton type="dc1x" value={match.odds.dc1x} label="1X" />
              <OddButton type="dc12" value={match.odds.dc12} label="12" />
              <OddButton type="dcx2" value={match.odds.dcx2} label="X2" />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
