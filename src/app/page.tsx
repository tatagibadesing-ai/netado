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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">

          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </main>

      {/* Floating Bet Slip */}
      <BetSlip />
    </>
  );
}
