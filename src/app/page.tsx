"use client";

import React from "react";
import { MatchCard } from "@/components/MatchCard";
import { BetSlip } from "@/components/BetSlip";
import { LeagueSelect } from "@/components/LeagueSelect";
import { useBet } from "@/context/BetContext";
import { RefreshCcw } from "lucide-react";
import { MyBets } from "@/components/MyBets";
import { motion } from "framer-motion";

export default function Home() {
  const { matches, isLoadingMatches, activeTab, selectedLeague, setSelectedLeague } = useBet();

  // Extract unique leagues for mobile dropdown
  const dynamicLeagues = Array.from(new Set(matches.map((m) => m.league)));
  const FAMOUS_LEAGUES = [
    "Brasileirão Série A",
    "Copa do Brasil",
    "CONMEBOL Libertadores",
    "CONMEBOL Sudamericana",
    "UEFA Champions League",
    "Premier League",
    "LaLiga",
  ];
  const allLeaguesSet = new Set([...FAMOUS_LEAGUES, ...dynamicLeagues]);
  const allLeagues = Array.from(allLeaguesSet).sort();

  // Filter matches
  const displayedMatches = selectedLeague
    ? matches.filter((m) => m.league === selectedLeague)
    : matches;

  return (
    <>
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col gap-8">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 line-clamp-2">
                    {selectedLeague ? selectedLeague : "Principais Eventos"}
                  </h2>
                  
                  {/* Mobile League Filter Button */}
                  <div className="lg:hidden w-full sm:w-[250px] shrink-0">
                    <LeagueSelect 
                      leagues={allLeagues} 
                      selectedLeague={selectedLeague} 
                      onSelectLeague={setSelectedLeague} 
                    />
                  </div>
                </div>
                
                {isLoadingMatches ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCcw className="w-8 h-8 animate-spin text-[#FF3C00] mb-4" />
                    <p>Buscando cotações em tempo real nas casas de aposta...</p>
                  </div>
                ) : displayedMatches.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 bg-[#121212] rounded-xl border border-white/5">
                    Nenhum evento encontrado para esta competição.
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
