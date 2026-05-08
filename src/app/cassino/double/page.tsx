"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { playBetPlaced, playCashout, playLose, playSpinTick, playSpinning, playWin } from "@/lib/sfx";

type Color = "red" | "black" | "white";
type Phase = "waiting" | "spinning" | "result";
interface Slot { value: number; color: Color; }
interface HistoryEntry { value: number; color: Color; }

const SLOTS: Slot[] = [
  { value: 0,  color: "white" },
  { value: 1,  color: "red"   }, { value: 2,  color: "black" },
  { value: 3,  color: "red"   }, { value: 4,  color: "black" },
  { value: 5,  color: "red"   }, { value: 6,  color: "black" },
  { value: 7,  color: "red"   }, { value: 8,  color: "black" },
  { value: 9,  color: "red"   }, { value: 10, color: "black" },
  { value: 11, color: "red"   }, { value: 12, color: "black" },
  { value: 13, color: "red"   }, { value: 14, color: "black" },
];

const MULTIPLIERS: Record<Color, number> = { red: 2.2, black: 2.2, white: 16 };
const SLOT_W = 110;
const GAP = 8;
const TRACK_REPS = 100;
const REST_REP = 2;
const REST_SLOT = 1;
const REST_GLOBAL = REST_REP * SLOTS.length + REST_SLOT;

const slotColor = (s: Slot) =>
  s.color === "white" ? "#e5e5e5" : s.color === "red" ? "#FF3C00" : "#1e1e1e";

function generateResult(): number { return Math.floor(Math.random() * 15); }

// Resultado enviesado para favorecer a cor escolhida pelo jogador (RTP ~130%)
// Probabilidades alvo: red=29%, black=29%, white=2%, vencedora_escolhida=40% (em vez de 46%/46%/7%)
// Para RTP=130% com escolha vencedora pagando 2.20x: 0.591 * 2.20 = 130%
// Para escolha branca: 0.0875 * 16 = 140%, próximo
function generateBiasedResult(favoredColor: "red" | "black" | "white" | null): number {
  if (!favoredColor) return generateResult();
  const r = Math.random();
  if (favoredColor === "white") {
    // P(white) = 0.0875 → RTP white = 140%
    if (r < 0.0875) return 0; // slot 0 é o white
    // distribuir o resto entre os 14 slots não-brancos
    return 1 + Math.floor(Math.random() * 14);
  } else {
    // P(escolhida) = 0.591 → RTP = 130%
    // P(white) = 0.0667 (1/15 normal), P(outra cor) = 0.342
    if (r < 0.591) {
      // forçar cor escolhida (red ou black)
      const color = favoredColor;
      const slots = [];
      for (let i = 0; i < 15; i++) if (i > 0 && (i % 2 === 1 ? "red" : "black") === color) slots.push(i);
      return slots[Math.floor(Math.random() * slots.length)];
    } else if (r < 0.591 + 0.0667) {
      return 0; // white
    } else {
      // outra cor
      const otherColor = favoredColor === "red" ? "black" : "red";
      const slots = [];
      for (let i = 0; i < 15; i++) if (i > 0 && (i % 2 === 1 ? "red" : "black") === otherColor) slots.push(i);
      return slots[Math.floor(Math.random() * slots.length)];
    }
  }
}

function useDoubleGame(getFavoredColor: () => "red" | "black" | "white" | null) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [countdown, setCountdown] = useState(5);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { value: 1, color: "red" }, { value: 8, color: "black" },
    { value: 0, color: "white" }, { value: 3, color: "red" },
    { value: 12, color: "black" }, { value: 5, color: "red" },
    { value: 14, color: "black" }, { value: 7, color: "red" },
  ]);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSpin = useCallback(() => {
    const favored = getFavoredColor();
    const idx = favored ? generateBiasedResult(favored) : generateResult();
    setResultIndex(idx);
    setPhase("spinning");
    spinTimeoutRef.current = setTimeout(() => {
      setPhase("result");
      setHistory(h => [{ value: SLOTS[idx].value, color: SLOTS[idx].color }, ...h].slice(0, 20));
    }, 4000);
  }, []);

  const scheduleNext = useCallback(() => {
    setPhase("waiting"); setCountdown(5); setResultIndex(null);
    let cd = 5;
    countdownRef.current = setInterval(() => {
      cd -= 1; setCountdown(cd);
      if (cd <= 0) { clearInterval(countdownRef.current!); startSpin(); }
    }, 1000);
  }, [startSpin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "result") { const t = setTimeout(scheduleNext, 3000); return () => clearTimeout(t); }
  }, [phase, scheduleNext]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return { phase, countdown, resultIndex, history };
}

const STEP = SLOT_W + GAP;
function slotX(globalIndex: number, containerW: number) {
  return containerW / 2 - (globalIndex * STEP + SLOT_W / 2);
}

function Reel({ phase, resultIndex }: { phase: Phase; resultIndex: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cssX, setCssX] = useState<number | null>(null);
  const [transition, setTransition] = useState("none");
  const lastGlobalRef = useRef<number>(REST_GLOBAL);
  const track: Slot[] = [];
  for (let i = 0; i < TRACK_REPS; i++) track.push(...SLOTS);
  const getW = () => containerRef.current?.offsetWidth ?? 800;

  useEffect(() => { setCssX(slotX(REST_GLOBAL, getW())); }, []);

  useEffect(() => {
    if (phase === "waiting") { setTransition("none"); }
    if (phase === "spinning" && resultIndex !== null) {
      const current = lastGlobalRef.current;
      const slotsPerRep = SLOTS.length;
      const currentSlotInRep = current % slotsPerRep;
      let delta = resultIndex - currentSlotInRep;
      if (delta <= 0) delta += slotsPerRep;
      const totalDelta = delta + Math.ceil(5 * slotsPerRep / slotsPerRep) * slotsPerRep;
      const finalGlobal = current + totalDelta;
      lastGlobalRef.current = finalGlobal;
      requestAnimationFrame(() => {
        setTransition("transform 3.8s cubic-bezier(0.05, 0.85, 0.2, 1.0)");
        setCssX(slotX(finalGlobal, getW()));
      });
    }
  }, [phase, resultIndex]);

  if (cssX === null) return <div style={{ height: SLOT_W + 40 }} />;

  return (
    <div className="relative w-full" style={{ height: SLOT_W + 40 }}>
      <div className="absolute left-1/2 -translate-x-1/2 w-[4px] bg-white z-20 pointer-events-none rounded-full" style={{ top: 0, height: SLOT_W + 40 }} />
      <div ref={containerRef} className="absolute inset-x-0 overflow-hidden" style={{ top: 20, height: SLOT_W }}>
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
        <div className="flex absolute top-0"
          style={{ gap: GAP, transform: `translateX(${cssX}px)`, transition, willChange: "transform" }}>
          {track.map((slot, i) => (
            <div key={i} className="shrink-0 rounded-md flex items-center justify-center select-none"
              style={{ width: SLOT_W, height: SLOT_W, background: slotColor(slot) }}>
              {slot.color === "white" ? (
                <img src="/netadologo.webp" alt="Netano"
                  style={{ width: SLOT_W * 0.55, height: SLOT_W * 0.55, objectFit: "contain" }} />
              ) : (
                <div className="flex items-center justify-center rounded-full font-semibold text-xl"
                  style={{ width: SLOT_W * 0.58, height: SLOT_W * 0.58, border: "3.5px solid rgba(255,255,255,0.85)", color: "#fff" }}>
                  {slot.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DoublePage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();
  const [betAmount, setBetAmount] = useState(10);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const betCountRef = useRef(0);
  const selectedColorRef = useRef<Color | null>(null);
  const betActiveRef = useRef(false);
  useEffect(() => { selectedColorRef.current = selectedColor; }, [selectedColor]);
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`double_bet_count_${userId}`);
    betCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);
  const getFavoredColor = useCallback((): Color | null => {
    // Só enviesa se: (1) usuário com aposta ativa e cor escolhida (2) ainda nas 8 primeiras
    if (!betActiveRef.current || !selectedColorRef.current) return null;
    if (betCountRef.current >= 8) return null;
    return selectedColorRef.current;
  }, []);
  const { phase, countdown, resultIndex, history } = useDoubleGame(getFavoredColor);
  const [betActive, setBetActive] = useState(false);
  useEffect(() => { betActiveRef.current = betActive; }, [betActive]);
  const [lastResult, setLastResult] = useState<{ won: boolean; payout: number } | null>(null);
  const prevPhase = useRef<Phase>("waiting");
  const resultSlot = resultIndex !== null ? SLOTS[resultIndex] : null;

  useEffect(() => {
    if (prevPhase.current === "spinning" && phase === "result" && betActive && resultIndex !== null && selectedColor) {
      const result = SLOTS[resultIndex];
      const won = result.color === selectedColor;
      const payout = won ? betAmount * MULTIPLIERS[selectedColor] : 0;
      if (won) {
        const newBalance = balance + payout;
        login(userId!, username!, newBalance);
        playCashout();
        setTimeout(() => playWin(), 150);
        (async () => {
          const { supabase } = await import("@/lib/supabase");
          await supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId);
        })();
      } else {
        playLose();
      }
      setLastResult({ won, payout });
      setBetActive(false);
    }
    prevPhase.current = phase;
  }, [phase, betActive, resultIndex, selectedColor, balance, userId, username, login, betAmount]);

  useEffect(() => {
    if (phase === "waiting" && countdown > 0 && countdown <= 3) {
      playSpinTick();
    }
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "spinning") return;
    const stop = playSpinning(4);
    return () => stop();
  }, [phase]);

  const handleBet = async () => {
    if (phase !== "waiting" || !selectedColor || betAmount <= 0 || betAmount > balance) return;
    betCountRef.current += 1;
    if (userId) localStorage.setItem(`double_bet_count_${userId}`, String(betCountRef.current));
    betActiveRef.current = true;
    setBetActive(true); setLastResult(null);
    playBetPlaced();
    const newBalance = balance - betAmount;
    login(userId!, username!, newBalance);
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId);
  };

  /* ── History squares (shared) ── */
  const HistoryBar = (
    <div className="flex gap-1.5 flex-wrap">
      {history.map((h, i) => (
        <div key={i} className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: slotColor({ value: h.value, color: h.color }), color: h.color === "white" ? "#111" : "#fff" }}>
          {h.value}
        </div>
      ))}
      <button className="ml-auto text-white/20 hover:text-white/50 transition-colors">
        <BarChart2 size={15} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0d] min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm font-semibold">Double</span>
        </div>
        <span className="text-white/40 text-xs font-medium">Netano Originals</span>
      </div>

      {/* History — mobile only */}
      <div className="md:hidden px-4 py-2 bg-[#111] border-b border-white/5">
        {HistoryBar}
      </div>

      {/* Main */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Left panel — desktop */}
        <div className="hidden md:flex w-[260px] shrink-0 bg-[#111] flex-col p-4 gap-4">
          <div>
            <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
            <div className="flex items-center gap-2 bg-[#0d0d0d] rounded px-3 py-2.5">
              <span className="text-white/40 text-xs font-medium">R$</span>
              <input type="number" value={betAmount}
                onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0" />
              <div className="flex gap-1">
                <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors">½</button>
                <button onClick={() => setBetAmount(v => v * 2)}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors">2x</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium block mb-2">Selecionar Cor</label>
            <div className="grid grid-cols-3 gap-2">
              {(["red", "white", "black"] as Color[]).map(c => (
                <button key={c} onClick={() => setSelectedColor(c)}
                  disabled={betActive || phase === "spinning"}
                  className="flex flex-col items-center justify-center py-3 rounded font-semibold text-xs transition-all disabled:opacity-50"
                  style={{
                    background: c === "red" ? "#FF3C00" : c === "white" ? "#e5e5e5" : "#2a2a2a",
                    color: c === "white" ? "#111" : "#fff",
                    outline: selectedColor === c ? "2px solid #FF3C00" : "2px solid transparent",
                    outlineOffset: "2px",
                  }}>
                  <span className="text-base font-bold">x{MULTIPLIERS[c]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <button onClick={handleBet}
              disabled={!selectedColor || betActive || phase !== "waiting" || betAmount > balance || betAmount <= 0}
              className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
              style={{ background: "#FF3C00" }}>
              {phase === "spinning" ? "Girando..." : betActive ? "Aposta feita!" : "Começar o jogo"}
            </button>
            <AnimatePresence>
              {lastResult && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`text-center text-xs font-medium ${lastResult.won ? "text-green-400" : "text-red-400"}`}>
                  {lastResult.won ? `Ganhou! +R$ ${lastResult.payout.toFixed(2)}` : `Perdeu R$ ${betAmount.toFixed(2)}`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="flex justify-between text-xs text-white/30 font-medium pt-3">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Right: reel + history */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] min-w-0 min-h-[220px]">
          <div className="flex items-center justify-center h-12">
            <AnimatePresence mode="wait">
              {phase === "waiting" && (
                <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-white/40 text-sm font-medium">
                  Próxima rodada em <span className="text-white font-semibold">{countdown}s</span>
                </motion.p>
              )}
              {phase === "spinning" && (
                <motion.p key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-white text-sm font-semibold">Girando...</motion.p>
              )}
              {phase === "result" && resultSlot && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm"
                    style={{ background: slotColor(resultSlot), color: resultSlot.color === "white" ? "#111" : "#fff" }}>
                    {resultSlot.value}
                  </div>
                  <p className="text-white font-semibold text-sm capitalize">
                    {resultSlot.color === "red" ? "Vermelho" : resultSlot.color === "black" ? "Preto" : "Branco"} — {MULTIPLIERS[resultSlot.color]}x
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 flex items-center px-4">
            <div className="w-full"><Reel phase={phase} resultIndex={resultIndex} /></div>
          </div>
          {/* History — desktop only */}
          <div className="hidden md:block px-5 py-3 bg-[#111]">
            <p className="text-xs text-white/30 font-medium mb-2">Giros anteriores</p>
            {HistoryBar}
          </div>
        </div>

        {/* Bottom panel — mobile only */}
        <div className="md:hidden bg-[#111] flex flex-col gap-3 p-4 border-t border-white/5">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
              <div className="flex items-center gap-1.5 bg-[#0d0d0d] rounded px-2.5 py-2">
                <span className="text-white/40 text-xs">R$</span>
                <input type="number" value={betAmount}
                  onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0" />
                <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))}
                  className="text-xs px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium">½</button>
                <button onClick={() => setBetAmount(v => v * 2)}
                  className="text-xs px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium">2x</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium block mb-2">Selecionar Cor</label>
            <div className="grid grid-cols-3 gap-2">
              {(["red", "white", "black"] as Color[]).map(c => (
                <button key={c} onClick={() => setSelectedColor(c)}
                  disabled={betActive || phase === "spinning"}
                  className="flex flex-col items-center justify-center py-3 rounded font-semibold text-xs transition-all disabled:opacity-50"
                  style={{
                    background: c === "red" ? "#FF3C00" : c === "white" ? "#e5e5e5" : "#2a2a2a",
                    color: c === "white" ? "#111" : "#fff",
                    outline: selectedColor === c ? "2px solid #FF3C00" : "2px solid transparent",
                    outlineOffset: "2px",
                  }}>
                  <span className="text-base font-bold">x{MULTIPLIERS[c]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={handleBet}
              disabled={!selectedColor || betActive || phase !== "waiting" || betAmount > balance || betAmount <= 0}
              className="w-full py-3 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
              style={{ background: "#FF3C00" }}>
              {phase === "spinning" ? "Girando..." : betActive ? "Aposta feita!" : "Começar o jogo"}
            </button>
            <AnimatePresence>
              {lastResult && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`text-center text-xs font-medium ${lastResult.won ? "text-green-400" : "text-red-400"}`}>
                  {lastResult.won ? `Ganhou! +R$ ${lastResult.payout.toFixed(2)}` : `Perdeu R$ ${betAmount.toFixed(2)}`}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
