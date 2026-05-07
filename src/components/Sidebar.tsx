"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { useBet } from "../context/BetContext";

const FAMOUS_LEAGUES = [
  "Brasileirão Série A",
  "Copa do Brasil",
  "CONMEBOL Libertadores",
  "CONMEBOL Sudamericana",
  "UEFA Champions League",
  "Premier League",
  "LaLiga",
];

export function Sidebar() {
  const { matches, selectedLeague, setSelectedLeague, activeTab } = useBet();

  // Extract unique leagues from current matches
  const dynamicLeagues = Array.from(new Set(matches.map((m) => m.league)));
  
  // Combine famous leagues with dynamic ones, removing duplicates
  const allLeaguesSet = new Set([...FAMOUS_LEAGUES, ...dynamicLeagues]);
  const allLeagues = Array.from(allLeaguesSet).sort();

  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 bg-[#121212] border-r border-white/5 h-[calc(100vh-64px)] sticky top-[64px] overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-[#181818]">
        <h3 className="font-bold text-white uppercase tracking-wide text-xs">
          Esportes / Competições
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        <button
          onClick={() => setSelectedLeague(null)}
          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
            selectedLeague === null 
              ? "bg-white/10 border-l-4 border-[#FF3C00] text-white font-bold" 
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent"
          }`}
        >
          <span className="text-sm">
            Todas as Competições
          </span>
          {selectedLeague === null && <ChevronRight className="w-4 h-4 text-[#FF3C00]" />}
        </button>

        {allLeagues.map((league) => (
          <button
            key={league}
            onClick={() => {
              setSelectedLeague(league);
            }}
            className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
              selectedLeague === league 
                ? "bg-white/10 border-l-4 border-[#FF3C00] text-white font-bold" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent"
            }`}
          >
            <span className="truncate pr-2 text-sm">
              <span className="truncate">{league}</span>
            </span>
            {selectedLeague === league && <ChevronRight className="w-4 h-4 text-[#FF3C00]" />}
          </button>
        ))}
      </div>
    </aside>
  );
}
