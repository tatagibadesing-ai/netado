"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MatchCard } from "@/components/MatchCard";
import { BetSlip } from "@/components/BetSlip";
import { Sidebar } from "@/components/Sidebar";
import { useBet } from "@/context/BetContext";
import { RefreshCcw, Filter } from "lucide-react";
import { MyBets } from "@/components/MyBets";
import { motion } from "framer-motion";

export default function Home() {
  const { matches, isLoadingMatches } = useBet();
  const [activeTab, setActiveTab] = useState<"apostas" | "historico">("apostas");
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // Extract unique leagues
  const leagues = Array.from(new Set(matches.map((m) => m.league))).sort();

  // Filter matches
  const displayedMatches = selectedLeague
    ? matches.filter((m) => m.league === selectedLeague)
    : matches;

  return (
    <>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col lg:flex-row gap-8 items-start relative">
        
        {/* Sidebar */}
        {activeTab === "apostas" && (
          <Sidebar 
            leagues={leagues} 
            selectedLeague={selectedLeague} 
            onSelectLeague={setSelectedLeague} 
          />
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6 w-full min-w-0">

          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === "apostas" ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {selectedLeague ? selectedLeague : "Principais Eventos"}
                  </h2>
                  
                  {/* Mobile League Filter Button (Visual only for now or could open a sheet) */}
                  <div className="lg:hidden">
                    <select 
                      className="bg-[#181818] border border-white/10 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF3C00]"
                      value={selectedLeague || ""}
                      onChange={(e) => setSelectedLeague(e.target.value || null)}
                    >
                      <option value="">Todas as Competições</option>
                      {leagues.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {isLoadingMatches ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCcw className="w-8 h-8 animate-spin text-[#FF3C00] mb-4" />
                    <p>Buscando cotações em tempo real nas casas de aposta...</p>
                  </div>
                ) : displayedMatches.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 bg-[#121212] rounded-xl border border-white/5">
                    Nenhum evento principal encontrado para hoje nesta competição.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedMatches.map((match) => (
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
      </main>

      {/* Floating Bet Slip */}
      <BetSlip />
    </>
  );
}
