"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { useBet } from "../context/BetContext";

interface NavbarProps {
  activeTab: "apostas" | "historico";
  setActiveTab: (tab: "apostas" | "historico") => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { balance } = useBet();

  return (
    <header className="bg-[#FF3C00] sticky top-0 z-50">
      <div className="w-full mx-auto px-4 lg:px-8 pt-3 pb-0 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
        
        {/* Top Row on Mobile: Logo & Balance */}
        <div className="flex items-center justify-between w-full md:w-auto md:h-full pb-1 md:pb-0">
          {/* Logo */}
          <div className="flex items-center gap-2 w-[120px] md:w-[200px]">
            <img 
              src="/netadologocompleta.webp" 
              alt="Netano" 
              className="h-5 md:h-7 w-auto object-contain cursor-pointer" 
            />
          </div>

          {/* Balance (Mobile only - Desktop balance is below) */}
          <div className="md:hidden flex items-center gap-2 w-[140px] justify-end">
            <div className="flex flex-col items-end">
              <span className="font-black text-white flex items-center gap-1 text-sm">
                R$ {balance.toFixed(2)}
              </span>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Center Tabs (Second row on mobile) */}
        <div className="flex items-center gap-6 md:gap-8 justify-start md:justify-center flex-1 overflow-x-auto no-scrollbar md:h-full">
          <button
            onClick={() => setActiveTab("apostas")}
            className={`flex items-center md:h-full border-b-[3px] pb-2 md:pb-0 pt-1 md:pt-0 transition-all whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-wider ${
              activeTab === "apostas"
                ? "border-white text-white"
                : "border-transparent text-white/90 hover:text-white hover:border-white/60"
            }`}
          >
            Apostas Esportivas
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`flex items-center md:h-full border-b-[3px] pb-2 md:pb-0 pt-1 md:pt-0 transition-all whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-wider ${
              activeTab === "historico"
                ? "border-white text-white"
                : "border-transparent text-white/90 hover:text-white hover:border-white/60"
            }`}
          >
            Histórico
          </button>
        </div>

        {/* Balance (Desktop only) */}
        <div className="hidden md:flex items-center gap-4 w-[200px] justify-end h-full">
          <div className="flex flex-col items-end">
            <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
              Saldo
            </span>
            <span className="font-black text-white flex items-center gap-1 text-lg">
              R$ {balance.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>
        
      </div>
    </header>
  );
}
