"use client";

import React from "react";
import { Wallet, Trophy, History } from "lucide-react";
import { useBet } from "../context/BetContext";

interface NavbarProps {
  activeTab: "apostas" | "historico";
  setActiveTab: (tab: "apostas" | "historico") => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { balance } = useBet();

  return (
    <header className="bg-[#121212] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
        
        {/* Top Row on Mobile: Logo & Balance */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 w-[120px] md:w-[200px]">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase italic">
              Netano<span className="text-[#FF3C00]">.</span>
            </h1>
          </div>

          {/* Balance (Mobile only - Desktop balance is below) */}
          <div className="md:hidden flex items-center gap-2 w-[120px] justify-end">
            <div className="flex flex-col items-end">
              <span className="font-bold text-[#FF3C00] flex items-center gap-1.5 text-sm">
                R$ {balance.toFixed(2)}
              </span>
            </div>
            <div className="w-8 h-8 bg-[#080808] rounded-full flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-[#FF3C00]" />
            </div>
          </div>
        </div>

        {/* Center Tabs (Second row on mobile) */}
        <div className="flex items-center gap-4 md:gap-8 justify-start md:justify-center flex-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab("apostas")}
            className={`flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap text-sm md:text-base ${
              activeTab === "apostas"
                ? "text-[#FF3C00] font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="w-4 h-4 md:w-5 md:h-5" />
            <span>Apostas</span>
            <span className="hidden sm:inline"> Esportivas</span>
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap text-sm md:text-base ${
              activeTab === "historico"
                ? "text-[#FF3C00] font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4 md:w-5 md:h-5" />
            <span>Histórico</span>
            <span className="hidden sm:inline"> (Minhas Apostas)</span>
          </button>
        </div>

        {/* Balance (Desktop only) */}
        <div className="hidden md:flex items-center gap-4 w-[200px] justify-end">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Saldo
            </span>
            <span className="font-bold text-[#FF3C00] flex items-center gap-1.5 text-base">
              R$ {balance.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 bg-[#080808] rounded-full flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-[#FF3C00]" />
          </div>
        </div>
        
      </div>
    </header>
  );
}
