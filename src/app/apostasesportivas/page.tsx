"use client";

import React, { useState, useEffect } from "react";
import { MatchCard } from "@/components/MatchCard";
import { BetSlip } from "@/components/BetSlip";
import { LeagueSelect } from "@/components/LeagueSelect";
import { useBet, isPickWon } from "@/context/BetContext";
import { RefreshCcw, CheckCircle2, XCircle, Clock, Trash2, Flame, Sparkles } from "lucide-react";
import { MyBets } from "@/components/MyBets";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getOddLabel, doesPickMatchScore } from "@/lib/odds";

const TEAM_ODDS_MAP: Record<string, number> = {
  "Brazil": 5.00,
  "Brasil": 5.00,
  "Argentina": 4.50,
  "France": 5.00,
  "França": 5.00,
  "Spain": 5.50,
  "Espanha": 5.50,
  "England": 6.00,
  "Inglaterra": 6.00,
  "Portugal": 7.50,
  "Germany": 9.00,
  "Alemanha": 9.00,
  "Netherlands": 11.00,
  "Holanda": 11.00,
  "Italy": 13.00,
  "Itália": 13.00,
  "Belgium": 15.00,
  "Bélgica": 15.00,
  "Uruguay": 18.00,
  "Uruguai": 18.00,
  "Croatia": 20.00,
  "Croácia": 20.00,
  "Colombia": 22.00,
  "Colômbia": 22.00,
  "Morocco": 25.00,
  "Marrocos": 25.00,
  "USA": 30.00,
  "EUA": 30.00,
  "Mexico": 35.00,
  "México": 35.00,
  "Japan": 40.00,
  "Japão": 40.00,
  "Switzerland": 45.00,
  "Suíça": 45.00,
  "Denmark": 50.00,
  "Dinamarca": 50.00,
  "Senegal": 50.00,
  "Sweden": 60.00,
  "Suécia": 60.00,
  "Austria": 70.00,
  "Áustria": 70.00,
  "Norway": 80.00,
  "Noruega": 80.00,
  "South Korea": 80.00,
  "Coreia do Sul": 80.00,
  "Türkiye": 90.00,
  "Turquia": 90.00,
  "Ukraine": 100.00,
  "Ucrânia": 100.00,
  "Ecuador": 100.00,
  "Equador": 100.00,
  "Ivory Coast": 100.00,
  "Costa do Marfim": 100.00,
  "Tunisia": 120.00,
  "Tunísia": 120.00,
  "Algeria": 120.00,
  "Argélia": 120.00,
  "Australia": 120.00,
  "Austrália": 120.00,
  "Czechia": 150.00,
  "Tchéquia": 150.00,
  "South Africa": 150.00,
  "África do Sul": 150.00,
  "Egypt": 150.00,
  "Egito": 150.00,
  "Paraguay": 150.00,
  "Paraguai": 150.00,
  "Saudi Arabia": 200.00,
  "Arábia Saudita": 200.00,
  "Bosnia-Herz": 200.00,
  "Bósnia e Herzegovina": 200.00,
  "Canada": 200.00,
  "Canadá": 200.00,
  "Qatar": 250.00,
  "Catar": 250.00,
  "Congo DR": 250.00,
  "RD Congo": 250.00,
  "Curaçao": 300.00,
  "Haiti": 300.00,
  "Iran": 300.00,
  "Irã": 300.00,
  "Iraq": 300.00,
  "Iraque": 300.00,
  "Jordan": 300.00,
  "Jordânia": 300.00,
  "New Zealand": 300.00,
  "Nova Zelândia": 300.00,
  "Panama": 300.00,
  "Panamá": 300.00,
  "Scotland": 300.00,
  "Escócia": 300.00,
  "Uzbekistan": 300.00,
  "Uzbequistão": 300.00,
};

const translations: Record<string, string> = {
  "Brazil": "Brasil",
  "Argentina": "Argentina",
  "Spain": "Espanha",
  "France": "França",
  "England": "Inglaterra",
  "Portugal": "Portugal",
  "Germany": "Alemanha",
  "Netherlands": "Holanda",
  "Italy": "Itália",
  "Uruguay": "Uruguai",
  "Croatia": "Croácia",
  "Belgium": "Bélgica",
  "Colombia": "Colômbia",
  "Morocco": "Marrocos",
  "USA": "EUA",
  "Mexico": "México",
  "Japan": "Japão",
  "Switzerland": "Suíça",
  "Denmark": "Dinamarca",
  "Senegal": "Senegal",
  "Sweden": "Suécia",
  "South Korea": "Coreia do Sul",
  "Ecuador": "Equador",
  "Algeria": "Argélia",
  "Canada": "Canadá",
  "Australia": "Austrália",
  "Iran": "Irã",
  "Turkey": "Turquia",
  "Türkiye": "Turquia",
  "Qatar": "Catar",
  "Saudi Arabia": "Arábia Saudita",
  "Egypt": "Egito",
  "Poland": "Polônia",
  "Czechia": "Tchéquia",
  "South Africa": "África do Sul",
  "Paraguay": "Paraguai",
  "Iraq": "Iraque",
  "Jordan": "Jordânia",
  "New Zealand": "Nova Zelândia",
  "Panama": "Panamá",
  "Scotland": "Escócia",
  "Uzbekistan": "Uzbequistão",
  "Congo DR": "RD Congo",
  "Bosnia-Herz": "Bósnia e Herzegovina",
  "Ghana": "Gana",
  "Cape Verde": "Cabo Verde",
  "Ivory Coast": "Costa do Marfim",
  "Tunisia": "Tunísia",
  "Curaçao": "Curaçao",
  "Haiti": "Haiti",
  "Austria": "Áustria",
  "Norway": "Noruega",
};

const translateTeamName = (name: string | undefined): string => {
  if (!name) return "";
  return translations[name] || name;
};

export default function ApostasEsportivas() {
  const {
    matches,
    isLoadingMatches,
    activeTab,
    selectedLeague,
    setSelectedLeague,
    wcJoined,
    wcBalance,
    wcCoringaAvailable,
    wcStreak,
    wcBestStreak,
    joinWcCompetition,
    username,
    placedBets,
    placeWinnerBet
  } = useBet();

  const [ranking, setRanking] = useState<{ username: string; wc_balance: number }[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [wcTab, setWcTab] = useState<"jogos" | "campeao" | "ranking" | "historico">("jogos");
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<{ name: string; displayName: string; logo: string; odd: number } | null>(null);
  const [winnerBetAmount, setWinnerBetAmount] = useState<number | "">("");

  // Extract unique leagues for mobile dropdown
  const dynamicLeagues = Array.from(new Set(matches.map((m) => m.league)));
  const FAMOUS_LEAGUES = [
    "Copa do Mundo",
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

  useEffect(() => {
    if (selectedLeague === "Copa do Mundo" && wcJoined) {
      setIsLoadingRanking(true);
      supabase
        .from("netano_profiles")
        .select("username, wc_balance")
        .eq("wc_joined", true)
        .order("wc_balance", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setRanking(data.map((r) => ({ username: r.username, wc_balance: Number(r.wc_balance) })));
          }
          setIsLoadingRanking(false);
        });
    }
  }, [selectedLeague, wcJoined]);

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
              selectedLeague === "Copa do Mundo" ? (
                /* Copa do Mundo View (Bolão da Copa) */
                !wcJoined ? (
                  /* Join Bolão Screen */
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-end lg:hidden w-full sm:w-[250px] shrink-0 mb-2">
                      <LeagueSelect 
                        leagues={allLeagues} 
                        selectedLeague={selectedLeague} 
                        onSelectLeague={setSelectedLeague} 
                      />
                    </div>
                    <div className="relative overflow-hidden bg-[#121212] rounded-2xl p-6 md:p-10 flex flex-col items-center text-center gap-6 shadow-2xl">
                      <div 
                        className="absolute top-0 left-0 right-0 pointer-events-none opacity-95 z-0"
                        style={{
                          height: "100%",
                          backgroundImage: "url('/svgpartedacopa.svg')",
                          backgroundSize: "cover",
                          backgroundPosition: "top center",
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                      <div 
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                          background: "linear-gradient(to bottom, transparent, #121212 90%)",
                        }}
                      />
                      
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <img src="/logocopa.webp" alt="Copa do Mundo 2026" className="h-16 md:h-20 w-auto object-contain mb-2" />
                        <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight font-sans">
                          Bolão da Copa do Mundo 2026
                        </h2>
                        <p className="text-slate-100 text-xs md:text-sm max-w-2xl leading-relaxed font-light">
                          Entre no grupo oficial da Copa e compita com os outros usuários! <br className="hidden md:inline" />
                          Todos começam com saldo virtual fixo para ver quem é o <span className="text-[#FF3C00] font-semibold">verdadeiro mestre das previsões</span>.
                        </p>
                        <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#121212]/70 rounded-xl px-4 py-2 mt-1">
                          <span className="text-xs md:text-sm font-bold text-white">O pódio ganha dinheiro!</span>
                          <span className="text-xs md:text-sm text-slate-200">
                            1º <span className="text-[#FFD700] font-bold">4,2%</span> · 2º <span className="font-bold">1,67%</span> · 3º <span className="text-[#CD7F32] font-bold">0,67%</span> do próprio saldo
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={joinWcCompetition}
                        className="relative z-10 bg-white hover:bg-[#f3f3f3] text-black font-bold px-8 py-4 rounded-lg transition-colors cursor-pointer text-sm uppercase tracking-wider shadow-lg"
                      >
                        Participar Gratuitamente
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dashboard Bolão */
                  <div className="flex flex-col gap-6">
                    {(() => {
                      const pendingWcBets = placedBets.filter(b => b.isWcBet && b.status === "pending");
                      return (
                        <div className="relative overflow-hidden bg-[#121212] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                          <div 
                            className="absolute inset-0 pointer-events-none opacity-95 z-0"
                            style={{
                              backgroundImage: "url('/svgpartedacopa.svg')",
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                            }}
                          />
                          <div 
                            className="absolute inset-0 pointer-events-none z-0"
                            style={{
                              background: "linear-gradient(to bottom, transparent, #121212 95%)",
                            }}
                          />
                          
                          <div className="flex items-start md:items-center gap-4 relative z-10 w-full md:w-auto">
                            <img src="/logocopa.webp" alt="Copa do Mundo 2026" className="h-12 md:h-16 w-auto object-contain shrink-0" />
                            <div className="flex-1">
                              <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                                Seu Painel do Bolão da Copa
                              </h3>
                              <p className="text-[11px] md:text-xs text-slate-200 mt-1">
                                Limite de aposta: <span className="font-bold text-white">75% do saldo atual</span> por palpite.
                              </p>
                            </div>
                          </div>

                          {/* Apostas em Andamento */}
                          <div className="flex flex-col gap-1.5 relative z-10 w-full md:max-w-[280px] bg-black/20 p-2.5 rounded-xl">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3C00] animate-pulse" />
                              Apostas em Andamento ({pendingWcBets.length})
                            </span>
                            {pendingWcBets.length === 0 ? (
                              <span className="text-xs text-slate-500 font-medium italic">Nenhuma aposta ativa</span>
                            ) : (
                              <div className="flex flex-col gap-1 max-h-[60px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                                {pendingWcBets.map((bet) => (
                                  <div key={bet.id} className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded-lg">
                                    <span className="font-semibold text-slate-300">
                                      R$ {bet.amount.toFixed(2)}
                                    </span>
                                    <span className="font-bold text-[#FF3C00]">
                                      R$ {bet.potentialReturn.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-4 relative z-10 w-full md:w-auto shrink-0 bg-black/30 px-4 md:px-6 py-4 rounded-xl">
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Saldo do Bolão</span>
                              <span className="text-xl md:text-2xl font-black text-[#FF3C00]">R$ {wcBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end md:items-start">
                              <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Aposta Máxima</span>
                              <span className="text-base md:text-lg font-bold text-slate-200">R$ {(wcBalance * 0.75).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      // Ofensiva (streak) vem do contexto. O painel ao vivo é
                      // derivado das partidas em andamento.
                      const liveBets = placedBets.filter(
                        (b) => b.isWcBet && b.status === "pending" &&
                          b.picks.some((p) => matches.find((m) => m.id === p.matchId)?.isLive)
                      );

                      if (wcStreak === 0 && wcBestStreak === 0 && !wcCoringaAvailable && liveBets.length === 0) return null;

                      return (
                        <div className="flex flex-col gap-4">
                          {/* Faixa de stats: ofensiva + coringa */}
                          <div className="flex flex-wrap items-center gap-2">
                            {(wcStreak > 0 || wcBestStreak > 0) && (
                              <span className="inline-flex items-center gap-1.5 bg-[#121212] px-3 py-1.5 rounded-lg text-xs font-bold text-white">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                Ofensiva: <span className="text-[#FF3C00]">{wcStreak}</span>
                                {wcBestStreak > 0 && <span className="text-slate-500 font-medium">· recorde {wcBestStreak}</span>}
                              </span>
                            )}
                            {wcCoringaAvailable && (
                              <span className="inline-flex items-center gap-1.5 bg-[#FF3C00]/10 px-3 py-1.5 rounded-lg text-xs font-bold text-[#FF3C00]">
                                <Sparkles className="w-3.5 h-3.5" />
                                Coringa disponível hoje
                              </span>
                            )}
                          </div>

                          {/* Painel "Ao Vivo Agora" */}
                          {liveBets.length > 0 && (
                            <div className="bg-[#121212] rounded-2xl p-4 flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <h4 className="text-sm font-bold text-white">Ao Vivo Agora</h4>
                                <span className="text-[10px] text-slate-500 font-medium">({liveBets.length} aposta{liveBets.length > 1 ? "s" : ""})</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {liveBets.map((bet) => {
                                  // Estado provisório do cupom: perde se algum palpite já fechou errado.
                                  let anyLost = false, allDecidedWon = true;
                                  bet.picks.forEach((p) => {
                                    const m = matches.find((mm) => mm.id === p.matchId);
                                    if (!m || (!m.isLive && !m.isFinished)) { allDecidedWon = false; return; }
                                    const won = doesPickMatchScore(p.oddType, m.homeScore ?? 0, m.awayScore ?? 0);
                                    if (!won) { allDecidedWon = false; if (m.isFinished) anyLost = true; }
                                  });
                                  const provisional = anyLost ? "losing" : allDecidedWon ? "winning" : "live";
                                  return (
                                    <div key={bet.id} className="bg-[#080808] rounded-lg p-3 flex flex-col gap-2">
                                      <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                                          provisional === "winning" ? "text-green-500" : provisional === "losing" ? "text-red-500" : "text-amber-500"
                                        }`}>
                                          {provisional === "winning" ? <><CheckCircle2 className="w-3 h-3" /> Ganhando</>
                                            : provisional === "losing" ? <><XCircle className="w-3 h-3" /> Perdendo</>
                                            : <><Clock className="w-3 h-3" /> Em jogo</>}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF3C00]">
                                          {bet.coringa && <Sparkles className="w-3 h-3" />}
                                          Se ganhar: R$ {bet.potentialReturn.toFixed(2)}
                                        </span>
                                      </div>
                                      {bet.picks.map((p, i) => {
                                        const m = matches.find((mm) => mm.id === p.matchId);
                                        const decided = m && (m.isLive || m.isFinished);
                                        const won = decided ? doesPickMatchScore(p.oddType, m!.homeScore ?? 0, m!.awayScore ?? 0) : null;
                                        return (
                                          <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                                            <span className="text-slate-300 truncate">
                                              {p.homeTeam} {decided ? `${m!.homeScore}-${m!.awayScore}` : "x"} {p.awayTeam}
                                              <span className="text-slate-500"> · {getOddLabel(p.oddType)}</span>
                                            </span>
                                            <span className="shrink-0">
                                              {won === true ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                : won === false ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                                                : <Clock className="w-3.5 h-3.5 text-slate-600" />}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col-reverse lg:flex-row lg:items-center justify-between pb-2 gap-3">
                        <div className="relative w-full">
                          {/* Degradês para o carrossel */}
                          <div className="absolute top-0 bottom-1 right-0 w-12 bg-gradient-to-l from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent pointer-events-none z-10" />
                          <div className="absolute top-0 bottom-1 left-0 w-4 bg-gradient-to-r from-[#0A0A0A] to-transparent pointer-events-none z-10" />
                          
                          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full pb-1">
                            <button
                              onClick={() => setWcTab("jogos")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                              wcTab === "jogos"
                                ? "bg-[#FF3C00] text-black"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            Partidas da Copa
                          </button>
                          <button
                            onClick={() => setWcTab("campeao")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                              wcTab === "campeao"
                                ? "bg-[#FF3C00] text-black"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            Campeão da Copa
                          </button>
                          <button
                            onClick={() => setWcTab("ranking")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                              wcTab === "ranking"
                                ? "bg-[#FF3C00] text-black"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            Classificação
                          </button>
                          <button
                            onClick={() => setWcTab("historico")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                              wcTab === "historico"
                                ? "bg-[#FF3C00] text-black"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            Histórico de Apostas
                          </button>
                          </div>
                        </div>
                        
                        <div className="lg:hidden w-full shrink-0">
                          <LeagueSelect 
                            leagues={allLeagues} 
                            selectedLeague={selectedLeague} 
                            onSelectLeague={setSelectedLeague} 
                          />
                        </div>
                      </div>

                      {wcTab === "jogos" ? (
                        isLoadingMatches ? (
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
                        )
                      ) : wcTab === "campeao" ? (
                        /* Tab Campeão da Copa */
                        <div className="flex flex-col gap-6">
                          {(() => {
                             const winnerDeadline = new Date("2026-07-15T23:59:59-04:00");
                             const now = new Date();
                             const timeDiff = winnerDeadline.getTime() - now.getTime();
                             const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                             const isWinnerBetClosed = daysDiff <= 0;

                             const r32MatchIds = new Set(Array.from({ length: 16 }, (_, i) => String(760486 + i)));
                             const r32Matches = matches.filter(m => m.league?.toLowerCase() === "copa do mundo" && r32MatchIds.has(m.id));

                             const teamsMap = new Map<string, string>();
                             r32Matches.forEach(m => {
                               if (m.homeTeam && !m.homeTeam.match(/^\d|[WL]\d|Venc|Perd|3RD/i)) {
                                 teamsMap.set(m.homeTeam, m.homeLogo || "");
                               }
                               if (m.awayTeam && !m.awayTeam.match(/^\d|[WL]\d|Venc|Perd|3RD/i)) {
                                 teamsMap.set(m.awayTeam, m.awayLogo || "");
                               }
                             });

                             let winnerOptions: { name: string; displayName: string; logo: string; odd: number }[] = [];

                             if (teamsMap.size > 0) {
                               winnerOptions = Array.from(teamsMap.entries()).map(([name, logo]) => {
                                 const displayName = translateTeamName(name);
                                 const odd = TEAM_ODDS_MAP[name] || TEAM_ODDS_MAP[displayName] || 50.0;
                                 return { name, displayName, logo, odd };
                               });
                             } else {
                               const fallbackTeams = [
                                 { name: "Brazil", displayName: "Brasil", logo: "https://a.espncdn.com/i/teamlogos/countries/500/bra.png", odd: 5.50 },
                                 { name: "Argentina", displayName: "Argentina", logo: "https://a.espncdn.com/i/teamlogos/countries/500/arg.png", odd: 6.00 },
                                 { name: "France", displayName: "França", logo: "https://a.espncdn.com/i/teamlogos/countries/500/fra.png", odd: 6.50 },
                                 { name: "Spain", displayName: "Espanha", logo: "https://a.espncdn.com/i/teamlogos/countries/500/esp.png", odd: 7.00 },
                                 { name: "England", displayName: "Inglaterra", logo: "https://a.espncdn.com/i/teamlogos/countries/500/eng.png", odd: 8.00 },
                                 { name: "Portugal", displayName: "Portugal", logo: "https://a.espncdn.com/i/teamlogos/countries/500/por.png", odd: 9.00 },
                                 { name: "Germany", displayName: "Alemanha", logo: "https://a.espncdn.com/i/teamlogos/countries/500/ger.png", odd: 11.00 },
                                 { name: "Netherlands", displayName: "Holanda", logo: "https://a.espncdn.com/i/teamlogos/countries/500/ned.png", odd: 13.00 },
                                 { name: "Italy", displayName: "Itália", logo: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png", odd: 15.00 },
                                 { name: "Uruguay", displayName: "Uruguai", logo: "https://a.espncdn.com/i/teamlogos/countries/500/uru.png", odd: 18.00 },
                                 { name: "Croatia", displayName: "Croácia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/cro.png", odd: 20.00 },
                                 { name: "Belgium", displayName: "Bélgica", logo: "https://a.espncdn.com/i/teamlogos/countries/500/bel.png", odd: 22.00 },
                                 { name: "Colombia", displayName: "Colômbia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/col.png", odd: 25.00 },
                                 { name: "Morocco", displayName: "Marrocos", logo: "https://a.espncdn.com/i/teamlogos/countries/500/mar.png", odd: 28.00 },
                                 { name: "USA", displayName: "EUA", logo: "https://a.espncdn.com/i/teamlogos/countries/500/usa.png", odd: 35.00 },
                                 { name: "Mexico", displayName: "México", logo: "https://a.espncdn.com/i/teamlogos/countries/500/mex.png", odd: 40.00 },
                                 { name: "Japan", displayName: "Japão", logo: "https://a.espncdn.com/i/teamlogos/countries/500/jpn.png", odd: 50.00 },
                                 { name: "Switzerland", displayName: "Suíça", logo: "https://a.espncdn.com/i/teamlogos/countries/500/sui.png", odd: 60.00 },
                                 { name: "Denmark", displayName: "Dinamarca", logo: "https://a.espncdn.com/i/teamlogos/countries/500/den.png", odd: 60.00 },
                                 { name: "Senegal", displayName: "Senegal", logo: "https://a.espncdn.com/i/teamlogos/countries/500/sen.png", odd: 60.00 },
                                 { name: "Sweden", displayName: "Suécia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/swe.png", odd: 80.00 },
                                 { name: "South Korea", displayName: "Coreia do Sul", logo: "https://a.espncdn.com/i/teamlogos/countries/500/kors.png", odd: 80.00 },
                                 { name: "Ecuador", displayName: "Equador", logo: "https://a.espncdn.com/i/teamlogos/countries/500/ecu.png", odd: 100.00 },
                                 { name: "Serbia", displayName: "Sérvia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/srb.png", odd: 100.00 },
                                 { name: "Cameroon", displayName: "Camarões", logo: "https://a.espncdn.com/i/teamlogos/countries/500/cmr.png", odd: 120.00 },
                                 { name: "Algeria", displayName: "Argélia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/alg.png", odd: 150.00 },
                                 { name: "Canada", displayName: "Canadá", logo: "https://a.espncdn.com/i/teamlogos/countries/500/can.png", odd: 150.00 },
                                 { name: "Australia", displayName: "Austrália", logo: "https://a.espncdn.com/i/teamlogos/countries/500/aus.png", odd: 150.00 },
                                 { name: "Poland", displayName: "Polônia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/pol.png", odd: 150.00 },
                                 { name: "Iran", displayName: "Irã", logo: "https://a.espncdn.com/i/teamlogos/countries/500/irn.png", odd: 200.00 },
                                 { name: "Türkiye", displayName: "Turquia", logo: "https://a.espncdn.com/i/teamlogos/countries/500/tur.png", odd: 200.00 },
                                 { name: "Qatar", displayName: "Catar", logo: "https://a.espncdn.com/i/teamlogos/countries/500/qat.png", odd: 250.00 },
                               ];
                               winnerOptions = fallbackTeams;
                             }

                             winnerOptions.sort((a, b) => a.odd - b.odd);

                            const existingWinnerBets = placedBets.filter(b => b.picks.some(p => p.matchId === "copa_winner"));

                            return (
                              <div className="flex flex-col gap-6">
                                <div className="bg-[#121212] p-6 rounded-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
                                  {/* SVG backdrop */}
                                  <div 
                                    className="absolute -top-8 left-0 right-0 pointer-events-none opacity-100 z-0"
                                    style={{
                                      height: "140px",
                                      backgroundImage: "url('/svgpartedacopa.svg')",
                                      backgroundSize: "100% 100%",
                                      backgroundPosition: "top center",
                                      backgroundRepeat: "no-repeat",
                                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)",
                                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)",
                                    }}
                                  />
                                  <div className="relative z-10 flex flex-col gap-1.5 w-full">
                                    <h3 className="text-lg font-semibold text-white leading-tight">
                                      Quem será o Campeão da Copa do Mundo 2026?
                                    </h3>
                                    <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                                      Escolha a seleção que vai levantar a taça! O valor é deduzido do seu Saldo do Bolão e o prêmio será pago ao final da competição com base na odd selecionada.
                                    </p>
                                  </div>
                                  <div className="relative z-10 shrink-0 bg-black/40 px-4 py-3 rounded-lg flex flex-col items-center md:items-end w-full md:w-auto">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prazo Limite</span>
                                    <span className={`text-xs font-black ${isWinnerBetClosed ? 'text-red-400' : 'text-[#FF3C00]'}`}>
                                      {isWinnerBetClosed 
                                        ? "Palpites Encerrados" 
                                        : `Restam ${daysDiff} dias para palpitar`
                                      }
                                    </span>
                                  </div>
                                </div>

                                {existingWinnerBets.length > 0 && (
                                  <div className="flex flex-col gap-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seus Palpites de Campeão</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {existingWinnerBets.map((bet) => {
                                        const pick = bet.picks[0];
                                        return (
                                          <div key={bet.id} className="bg-[#121212]/80 p-3 rounded-lg flex items-center justify-between text-xs shadow-md">
                                            <div className="flex items-center gap-2">
                                              {pick.homeLogo && <img src={pick.homeLogo} alt="" className="w-5 h-5 object-contain" />}
                                              <span className="font-semibold text-white">{translateTeamName(pick.homeTeam)}</span>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-bold text-slate-200">R$ {bet.amount.toFixed(2)} @ {bet.totalOdds.toFixed(2)}</div>
                                              <div className="text-[10px] text-[#FF3C00]">Retorno: R$ {bet.potentialReturn.toFixed(2)}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {winnerOptions.map((option) => {
                                    const isSelected = selectedWinnerTeam?.name === option.name;
                                    return (
                                      <div 
                                        key={option.name} 
                                        className="bg-[#121212] rounded-xl flex flex-col p-4 w-full relative overflow-hidden"
                                      >
                                        <div 
                                          className="absolute top-0 left-0 right-0 pointer-events-none opacity-95 z-0"
                                          style={{
                                            height: "50%",
                                            backgroundImage: "url('/svgpartedacopa.svg')",
                                            backgroundSize: "100% 100%",
                                            backgroundPosition: "top center",
                                            backgroundRepeat: "no-repeat",
                                          }}
                                        />
                                        <div 
                                          className="absolute inset-0 pointer-events-none z-0"
                                          style={{
                                            background: "linear-gradient(to bottom, transparent, #121212 50%)",
                                          }}
                                        />
                                        <div className="relative z-10 flex flex-col items-center gap-4 w-full">
                                          <div className="flex flex-col items-center gap-2">
                                            <img src={option.logo} alt="" className="w-12 h-12 object-contain" />
                                            <span className="text-xs font-semibold text-slate-100 text-center truncate w-full">{option.displayName || option.name}</span>
                                          </div>
                                          <button
                                            disabled={isWinnerBetClosed}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedWinnerTeam(option);
                                            }}
                                            className={`flex items-center justify-between px-3 py-1.5 rounded w-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                              isSelected
                                                ? "bg-[#FF3C00] text-black"
                                                : "bg-[#080808] text-slate-300 hover:bg-[#1a1a1a]"
                                            }`}
                                          >
                                            <span className={`font-normal opacity-70 text-xs ${isSelected ? "text-black" : ""}`}>Odd</span>
                                            <span className="text-sm">{option.odd.toFixed(2)}</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : wcTab === "ranking" ? (
                        (() => {
                          // Premiação final do bolão: % do próprio saldo para o top 3.
                          const PRIZE_PCTS = [0.042, 0.0167, 0.0067];
                          const MEDALS = ["🥇", "🥈", "🥉"];
                          const prizeFor = (idx: number, bal: number) => (idx >= 0 && idx < 3 ? bal * PRIZE_PCTS[idx] : 0);

                          const myIndex = ranking.findIndex(p => p.username.toLowerCase() === username?.toLowerCase());
                          const me = myIndex >= 0 ? ranking[myIndex] : null;
                          const personAbove = myIndex > 0 ? ranking[myIndex - 1] : null;
                          const podiumThird = ranking[2] ?? null;
                          const gapToNext = me && personAbove ? personAbove.wc_balance - me.wc_balance : 0;
                          const gapToPodium = me && podiumThird ? podiumThird.wc_balance - me.wc_balance : 0;

                          return (
                            <div className="flex flex-col gap-3">
                              {/* Premiação — linha discreta */}
                              <p className="text-xs text-slate-400 px-1">
                                Premiação final p/ o top 3:{" "}
                                <span className="text-[#FFD700] font-bold">4,2%</span> ·{" "}
                                <span className="text-slate-200 font-bold">1,67%</span> ·{" "}
                                <span className="text-[#CD7F32] font-bold">0,67%</span> do próprio saldo.
                              </p>

                              {/* Sua posição — linha discreta */}
                              {me && (
                                <p className="text-xs text-slate-400 px-1">
                                  Você está em <span className="font-bold text-white">{myIndex + 1}º</span> de {ranking.length}
                                  {myIndex === 0
                                    ? <span className="text-[#FFD700]"> — você lidera! 👑</span>
                                    : myIndex < 3
                                      ? <> — faltam <span className="font-semibold text-white">R$ {gapToNext.toFixed(2)}</span> pra subir.</>
                                      : <> — faltam <span className="font-semibold text-white">R$ {gapToPodium.toFixed(2)}</span> pra entrar no pódio.</>}
                                </p>
                              )}

                              {isLoadingRanking ? (
                                <div className="flex items-center justify-center py-12 text-slate-500 bg-[#121212] rounded-xl">
                                  <RefreshCcw className="w-6 h-6 animate-spin text-[#FF3C00]" />
                                </div>
                              ) : ranking.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 bg-[#121212] rounded-xl">
                                  Ninguém no ranking ainda. <span className="text-white font-semibold">Seja o primeiro a apostar!</span>
                                </div>
                              ) : (
                                <div className="bg-[#121212] rounded-xl overflow-hidden relative shadow-2xl">
                                  {/* SVG discreto de fundo na área do cabeçalho */}
                                  <div
                                    className="absolute top-0 left-0 right-0 pointer-events-none opacity-100 z-0"
                                    style={{
                                      height: "80px",
                                      backgroundImage: "url('/svgpartedacopa.svg')",
                                      backgroundSize: "cover",
                                      backgroundPosition: "top center",
                                      backgroundRepeat: "no-repeat",
                                      maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                                      WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                                    }}
                                  />
                                  <div className="relative z-10 p-4 bg-[#181818]/40 border-b border-white/5 flex items-center justify-between">
                                    <h4 className="font-bold text-white text-sm">Ranking Geral do Bolão</h4>
                                    <span className="text-xs text-slate-200 font-bold">{ranking.length} Competidores</span>
                                  </div>
                                  <div className="overflow-x-auto relative z-10">
                                    <table className="w-full text-left text-sm border-collapse">
                                      <thead>
                                        <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold bg-[#0d0d0d]/40">
                                          <th className="py-3 px-2.5 md:px-4 w-10 md:w-16 text-center font-medium">Pos</th>
                                          <th className="py-3 px-2.5 md:px-4 font-medium">Usuário</th>
                                          <th className="py-3 px-2.5 md:px-4 text-right font-medium whitespace-nowrap">
                                            <span className="md:hidden">Saldo</span>
                                            <span className="hidden md:inline">Saldo do Bolão</span>
                                          </th>
                                          <th className="py-3 px-2.5 md:px-4 text-right font-medium whitespace-nowrap">Prêmio</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                        {ranking.map((player, idx) => {
                                          const isCurrentUser = player.username.toLowerCase() === username?.toLowerCase();
                                          const prize = prizeFor(idx, player.wc_balance);
                                          return (
                                            <tr
                                              key={idx}
                                              className={`hover:bg-white/5 transition-colors ${
                                                isCurrentUser ? "bg-white/5 font-semibold text-white" : "text-slate-300"
                                              }`}
                                            >
                                              <td className="py-3.5 px-2.5 md:px-4 text-center">
                                                <span className="font-bold">{idx < 3 ? MEDALS[idx] : <span className="text-slate-500">{idx + 1}</span>}</span>
                                              </td>
                                              <td className="py-3.5 px-2.5 md:px-4 max-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className="truncate">{player.username}</span>
                                                  {isCurrentUser && (
                                                    <span className="bg-white/10 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0">
                                                      Você
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-3.5 px-2.5 md:px-4 text-right font-bold text-slate-100 whitespace-nowrap">
                                                R$ {player.wc_balance.toFixed(2)}
                                              </td>
                                              <td className="py-3.5 px-2.5 md:px-4 text-right font-bold whitespace-nowrap">
                                                {prize > 0 ? <span className="text-[#FF3C00]">R$ {prize.toFixed(2)}</span> : <span className="text-slate-600">—</span>}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        /* Histórico de Apostas Tab (Identical to /historico / MyBets design) */
                        <div className="flex flex-col gap-6">
                          {(() => {
                            const wcBets = placedBets.filter(b => b.isWcBet);
                            if (wcBets.length === 0) {
                              return (
                                <div className="text-center py-10 text-slate-500 bg-[#121212]">
                                  Você ainda não fez nenhuma aposta no Bolão da Copa.
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 gap-4">
                                <AnimatePresence>
                                  {wcBets.map((bet) => {
                                    const getStatusIcon = (status: string) => {
                                      switch (status) {
                                        case "won": return <CheckCircle2 className="w-5 h-5 text-[#FF3C00]" />;
                                        case "lost": return <XCircle className="w-5 h-5 text-red-500" />;
                                        case "cancelled": return <Trash2 className="w-5 h-5 text-slate-500" />;
                                        default: return <Clock className="w-5 h-5 text-amber-500" />;
                                      }
                                    };
                                    return (
                                      <motion.div
                                        key={bet.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-[#121212]/90 p-5 flex flex-col gap-4 relative overflow-hidden rounded-xl"
                                      >
                                        {/* Discrete SVG background */}
                                        <div 
                                          className="absolute inset-0 pointer-events-none opacity-30 z-0"
                                          style={{
                                            backgroundImage: "url('/svgpartedacopa.svg')",
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            backgroundRepeat: "no-repeat",
                                          }}
                                        />

                                        {/* Bet Header */}
                                        <div className="flex justify-between items-center pb-3 relative z-10">
                                          <div className="flex items-center gap-3">
                                            {getStatusIcon(bet.status)}
                                            <span className="font-bold text-lg uppercase tracking-wide">
                                              {bet.status === "pending" && <span className="text-slate-200">Pendente</span>}
                                              {bet.status === "won" && <span className="text-[#FF3C00]">Ganha</span>}
                                              {bet.status === "lost" && <span className="text-red-500">Perdida</span>}
                                              {bet.status === "cancelled" && <span className="text-slate-500">Anulada</span>}
                                            </span>
                                            {bet.coringa && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#FF3C00] bg-[#FF3C00]/15 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                                <Sparkles className="w-3 h-3" /> Coringa
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-xs text-slate-300 font-mono bg-[#080808]/75 px-2 py-1 rounded">
                                            ID: {bet.id}
                                          </span>
                                        </div>

                                        {/* Picks */}
                                        <div className="flex flex-col gap-3 relative z-10">
                                          {bet.picks.map((pick, i) => {
                                            const match = matches.find((m) => m.id === pick.matchId);
                                            const homeTeam = pick.homeTeam || match?.homeTeam || "Time Casa";
                                            const awayTeam = pick.awayTeam || match?.awayTeam || "Time Fora";
                                            const homeLogo = pick.homeLogo || match?.homeLogo;
                                            const awayLogo = pick.awayLogo || match?.awayLogo;

                                            const hasSnapshot = pick.finalHomeScore !== undefined && pick.finalAwayScore !== undefined;
                                            const displayHomeScore = match?.isFinished ? match.homeScore : (hasSnapshot ? pick.finalHomeScore : undefined);
                                            const displayAwayScore = match?.isFinished ? match.awayScore : (hasSnapshot ? pick.finalAwayScore : undefined);
                                            const showScore = displayHomeScore !== undefined && displayAwayScore !== undefined;

                                            let pickResult: boolean | null = null;
                                            if (match) {
                                              pickResult = isPickWon(pick, match);
                                            } else if (hasSnapshot) {
                                              pickResult = isPickWon(pick, { isFinished: true, homeScore: pick.finalHomeScore, awayScore: pick.finalAwayScore } as any);
                                            }

                                            return (
                                              <div key={i} className="flex flex-col gap-3 bg-[#080808]/70 p-4 rounded-lg relative overflow-hidden">
                                                {/* Indicador de Acerto / Erro na Borda */}
                                                {pickResult === true && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                                                {pickResult === false && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                                                
                                                {/* Cabecalho do Jogo e Logos */}
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                      {homeLogo ? (
                                                        <img src={homeLogo} alt="" className="w-5 h-5 object-contain" />
                                                      ) : (
                                                        <div className="w-5 h-5 bg-[#1a1a1a] rounded-full" />
                                                      )}
                                                      <span className="text-sm font-semibold text-white">{homeTeam}</span>
                                                    </div>
                                                    <span className="text-slate-600 text-xs font-black">X</span>
                                                    <div className="flex items-center gap-2">
                                                      {awayLogo ? (
                                                        <img src={awayLogo} alt="" className="w-5 h-5 object-contain" />
                                                      ) : (
                                                        <div className="w-5 h-5 bg-[#1a1a1a] rounded-full" />
                                                      )}
                                                      <span className="text-sm font-semibold text-white">{awayTeam}</span>
                                                    </div>
                                                  </div>

                                                  {/* Placar Final */}
                                                  {showScore && (
                                                    <div className="bg-[#1a1a1a] px-2 py-0.5 rounded font-bold text-sm text-[#FF3C00]">
                                                      {displayHomeScore} - {displayAwayScore}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Detalhes da Odd e Resultado */}
                                                <div className="flex justify-between items-center bg-[#121212]/60 p-2 rounded">
                                                  <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-300 uppercase tracking-wider">Sua Aposta</span>
                                                    <span className="font-bold text-white">{getOddLabel(pick.oddType)}</span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-4">
                                                    {pickResult === true && <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ACERTOU</span>}
                                                    {pickResult === false && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> ERROU</span>}
                                                    {pickResult === null && bet.status === "pending" && <span className="text-xs font-bold text-slate-300">PENDENTE</span>}
                                                    
                                                    <span className="font-black text-[#FF3C00] text-lg bg-[#080808]/75 px-2 py-0.5 rounded">
                                                      {pick.oddValue.toFixed(2)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Bet Footer */}
                                        <div className="flex items-center justify-between pt-3 relative z-10">
                                          <div className="flex flex-col">
                                            <span className="text-xs text-slate-300">Valor Apostado</span>
                                            <span className="font-bold text-white">R$ {bet.amount.toFixed(2)}</span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-xs text-slate-300">Retorno Potencial</span>
                                            <span className={`font-bold text-lg ${bet.status === 'won' ? 'text-[#FF3C00]' : 'text-white'}`}>
                                              R$ {bet.potentialReturn.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* Regular Leagues View */
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
              )
            ) : (
              <MyBets />
            )}
          </motion.div>
        </div>
      </main>

      {/* Champion Betting Modal */}
      {selectedWinnerTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] p-6 rounded-2xl max-w-sm w-full border border-white/10 relative overflow-hidden shadow-2xl">
            {/* SVG background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20 z-0"
              style={{
                backgroundImage: "url('/svgpartedacopa.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img src={selectedWinnerTeam.logo} alt="" className="w-10 h-10 object-contain" />
                <div>
                  <h4 className="font-bold text-white text-base leading-tight font-sans">
                    {selectedWinnerTeam.displayName || selectedWinnerTeam.name} Campeão
                  </h4>
                  <span className="text-xs text-slate-400">Odd de Cotação: <span className="font-bold text-[#FF3C00]">{selectedWinnerTeam.odd.toFixed(2)}</span></span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs text-slate-300">Valor da Aposta (R$)</label>
                <input
                  type="number"
                  value={winnerBetAmount}
                  onChange={(e) => setWinnerBetAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="w-full bg-[#080808]/80 focus:border-[#FF3C00] border border-white/5 rounded-lg px-4 py-2 text-lg font-bold outline-none text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">
                  Saldo Bolão: R$ {wcBalance.toFixed(2)} (Máx: R$ {(wcBalance * 0.75).toFixed(2)})
                </span>
              </div>

              {winnerBetAmount !== "" && (
                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-slate-400">Retorno Potencial</span>
                  <span className="font-bold text-[#FF3C00] text-sm">
                    R$ {(Number(winnerBetAmount) * selectedWinnerTeam.odd).toFixed(2)}
                  </span>
                </div>
              )}

              {winnerBetAmount !== "" && Number(winnerBetAmount) > wcBalance && (
                <p className="text-[10px] text-red-400 font-semibold">
                  Saldo insuficiente no Bolão!
                </p>
              )}

              {winnerBetAmount !== "" && Number(winnerBetAmount) <= wcBalance && Number(winnerBetAmount) > wcBalance * 0.75 && (
                <p className="text-[10px] text-red-400 font-semibold">
                  Excede o limite de 75% do saldo do Bolão!
                </p>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setSelectedWinnerTeam(null);
                    setWinnerBetAmount("");
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-200 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  disabled={
                    !winnerBetAmount || 
                    Number(winnerBetAmount) <= 0 || 
                    Number(winnerBetAmount) > wcBalance || 
                    Number(winnerBetAmount) > wcBalance * 0.75
                  }
                  onClick={async () => {
                    const success = await placeWinnerBet(
                      selectedWinnerTeam.name,
                      selectedWinnerTeam.logo,
                      selectedWinnerTeam.odd,
                      Number(winnerBetAmount)
                    );
                    if (success) {
                      setSelectedWinnerTeam(null);
                      setWinnerBetAmount("");
                      setWcTab("historico");
                    }
                  }}
                  className="flex-1 bg-[#FF3C00] hover:bg-[#FF3C00]/80 disabled:bg-[#1a1a1a] disabled:text-slate-600 text-black py-2.5 rounded-lg text-xs font-black transition-colors cursor-pointer text-center"
                >
                  Confirmar Aposta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bet Slip */}
      <BetSlip />
    </>
  );
}
