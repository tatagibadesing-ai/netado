import React from "react";
import { Trophy, Star, ChevronRight } from "lucide-react";

interface SidebarProps {
  leagues: string[];
  selectedLeague: string | null;
  onSelectLeague: (league: string | null) => void;
}

export function Sidebar({ leagues, selectedLeague, onSelectLeague }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[250px] shrink-0 bg-[#121212] rounded-xl border border-white/5 overflow-hidden sticky top-[80px] h-[calc(100vh-100px)]">
      <div className="p-4 border-b border-white/5 bg-[#181818]">
        <h3 className="font-bold text-white flex items-center gap-2 uppercase tracking-wide text-sm">
          <Star className="w-4 h-4 text-[#FF3C00]" />
          Competições Favoritas
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        <button
          onClick={() => onSelectLeague(null)}
          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
            selectedLeague === null 
              ? "bg-white/10 border-l-4 border-[#FF3C00] text-white font-bold" 
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent"
          }`}
        >
          <span className="flex items-center gap-3">
            <Trophy className="w-4 h-4" />
            Todas as Competições
          </span>
          {selectedLeague === null && <ChevronRight className="w-4 h-4 text-[#FF3C00]" />}
        </button>

        {leagues.map((league) => (
          <button
            key={league}
            onClick={() => onSelectLeague(league)}
            className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
              selectedLeague === league 
                ? "bg-white/10 border-l-4 border-[#FF3C00] text-white font-bold" 
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent"
            }`}
          >
            <span className="flex items-center gap-3 truncate pr-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <span className="truncate">{league}</span>
            </span>
            {selectedLeague === league && <ChevronRight className="w-4 h-4 text-[#FF3C00]" />}
          </button>
        ))}
      </div>
    </aside>
  );
}
