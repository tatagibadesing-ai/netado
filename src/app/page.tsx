"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MatchCard } from "@/components/MatchCard";
import { BetSlip } from "@/components/BetSlip";
import { useBet } from "@/context/BetContext";
import { Trophy, History, RefreshCcw } from "lucide-react";
import { MyBets } from "@/components/MyBets";
import { motion } from "framer-motion";

export default function Home() {
  const { matches, isLoadingMatches, refreshMatches } = useBet();
  const [activeTab, setActiveTab] = useState<"apostas" | "historico">("apostas");

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Tabs */}
          <div className="flex items-center justify-between md:justify-start gap-2 md:gap-6 border-b border-[#121212] pb-2 w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("apostas")}
                className={`flex items-center gap-1.5 md:gap-2 pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm md:text-base ${
                  activeTab === "apostas"
                    ? "border-[#FF3C00] text-[#FF3C00] font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Apostas Esportivas</span>
                <span className="sm:hidden">Apostas</span>
              </button>
              <button
                onClick={() => setActiveTab("historico")}
                className={`flex items-center gap-1.5 md:gap-2 pb-2 px-1 border-b-2 transition-colors whitespace-nowrap text-sm md:text-base ${
                  activeTab === "historico"
                    ? "border-[#FF3C00] text-[#FF3C00] font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Minhas Apostas</span>
                <span className="sm:hidden">Histórico</span>
              </button>
            </div>

            <div className="ml-auto flex shrink-0">
              <button
                onClick={refreshMatches}
                className="flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold text-black transition-colors px-3 md:px-4 py-1.5 md:py-2 rounded bg-[#FF3C00] hover:bg-[#FF3C00]/80 whitespace-nowrap"
              >
                <RefreshCcw className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isLoadingMatches ? 'animate-spin' : ''}`} /> 
                <span className="hidden md:inline">Atualizar Odds</span>
                <span className="md:hidden">Atualizar</span>
              </button>
            </div>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "apostas" ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Principais Eventos</h2>
                </div>
                {isLoadingMatches ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCcw className="w-8 h-8 animate-spin text-[#FF3C00] mb-4" />
                    <p>Buscando cotações em tempo real nas casas de aposta...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    Nenhum evento principal encontrado para hoje.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                    {matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <MyBets />
            )}
          </motion.div>
        </div>

        {/* Sidebar Bet Slip */}
        <div className="w-full lg:w-[350px] flex-shrink-0">
          <div className="sticky top-24">
            <BetSlip />
          </div>
        </div>
      </main>
    </>
  );
}
