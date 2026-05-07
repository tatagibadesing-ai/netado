"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy } from "lucide-react";

interface LeagueSelectProps {
  leagues: string[];
  selectedLeague: string | null;
  onSelectLeague: (league: string | null) => void;
}

export function LeagueSelect({ leagues, selectedLeague, onSelectLeague }: LeagueSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#1E1E1E] text-white rounded-lg px-4 py-3 text-sm transition-all focus:outline-none hover:bg-[#252525]"
      >
        <span className="truncate pr-2 font-medium">
          {selectedLeague ? selectedLeague : "Todas as Competições"}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-[#1E1E1E] rounded-lg shadow-2xl overflow-hidden max-h-[250px] flex flex-col"
          >
            <div className="overflow-y-auto no-scrollbar py-1">
              <button
                onClick={() => {
                  onSelectLeague(null);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                  selectedLeague === null 
                    ? "bg-[#FF3C00]/10 text-[#FF3C00] font-bold" 
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="truncate">Todas as Competições</span>
              </button>
              
              {leagues.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    onSelectLeague(l);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                    selectedLeague === l 
                      ? "bg-[#FF3C00]/10 text-[#FF3C00] font-bold" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate">{l}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
