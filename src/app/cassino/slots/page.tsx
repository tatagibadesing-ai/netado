"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, RefreshCw, Zap } from "lucide-react";
import Image from "next/image";

const ACCENT  = "#FF3C00";
const GREEN   = "#07E385";
const PAGE_BG = "#0d0d0d";
const PANEL_BG = "#111";

/* ── Symbols ─────────────────────────────────────────── */
type SymbolId = "cherry" | "star" | "diamond" | "seven" | "flame" | "zap";

interface SlotSymbol { id: SymbolId; color: string; weight: number; }

const SYMBOLS: SlotSymbol[] = [
  { id: "cherry",  color: "#ef4444", weight: 224 },
  { id: "star",    color: "#eab308", weight: 198 },
  { id: "flame",   color: "#f97316", weight: 178 },
  { id: "zap",     color: "#a78bfa", weight: 160 },
  { id: "diamond", color: "#38bdf8", weight: 130 },
  { id: "seven",   color: "#ff3c00", weight: 110 },
];

const SYMBOL_IMAGES: Record<SymbolId, string> = {
  cherry:  "/cerejaicone.webp",
  star:    "/estralaicone.webp",
  flame:   "/sinoicone.webp",
  zap:     "/moedaicone.webp",
  diamond: "/diamanteicone.webp",
  seven:   "/7icone.webp",
};

function SymbolIcon({ id, size = 36 }: { id: SymbolId; size?: number; color: string }) {
  return (
    <Image
      src={SYMBOL_IMAGES[id]}
      alt={id}
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

const PAYOUTS: Record<SymbolId, number> = {
  cherry: 3, star: 4, flame: 5, zap: 8, diamond: 15, seven: 21,
};
const TWO_PAYOUT = 1.03;
const BOOST_MATCH    = 0.20;  // chance do rolo 2 copiar rolo 1 (e do rolo 3 quando r0==r1)
const BOOST_MISMATCH = 0.60;  // anti-par no rolo 3 quando r0!=r1

// Boost de boas-vindas (primeiras 10 apostas) — RTP ~150% só por mais frequência de vitórias
const WELCOME_BOOST_MATCH    = 0.25;
const WELCOME_BOOST_MISMATCH = 0.00;

function pickRandom(): SymbolId {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * total;
  for (const sym of SYMBOLS) { r -= sym.weight; if (r <= 0) return sym.id; }
  return SYMBOLS[SYMBOLS.length - 1].id;
}

function pickSymbol(prev: SymbolId | undefined, antiPrev: SymbolId | undefined, bm: number, bmm: number): SymbolId {
  // Se há antiPrev (rolo 3 quando r0!=r1), reduz chance de repetir prev (evita par extra)
  if (prev && antiPrev !== undefined) {
    if (Math.random() < bmm) {
      let s: SymbolId;
      do { s = pickRandom(); } while (s === prev);
      return s;
    }
    return pickRandom();
  }
  // Boost de cópia normal
  if (prev && Math.random() < bm) return prev;
  return pickRandom();
}

function evaluate(reels: [SymbolId, SymbolId, SymbolId]): { multiplier: number; label: string } {
  const [a, b, c] = reels;
  if (a === b && b === c) return { multiplier: PAYOUTS[a], label: `3x ${a}` };
  if (a === b || b === c || a === c) return { multiplier: TWO_PAYOUT, label: "Par!" };
  return { multiplier: 0, label: "" };
}

/* ── Audio ───────────────────────────────────────────── */
function useSlotAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  function ctx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  // Chama no primeiro hover/focus do botão para eliminar latência de inicialização
  function prime() {
    const ac = ctx();
    // toca um oscilador silencioso para "acordar" o contexto
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.001);
  }

  function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.18, delay = 0) {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  }

  function playNoise(duration: number, vol = 0.12, delay = 0) {
    const ac = ctx();
    const bufLen = ac.sampleRate * duration;
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    src.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(vol, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    src.start(ac.currentTime + delay);
    src.stop(ac.currentTime + delay + duration + 0.05);
  }

  return {
    spinStart() {
      // mecanismo de slot girando: cliques rítmicos
      for (let i = 0; i < 8; i++) {
        playNoise(0.04, 0.08, i * 0.07);
        playTone(180 + i * 15, "sawtooth", 0.05, 0.06, i * 0.07);
      }
    },
    reelStop(reelIndex: number) {
      const delay = reelIndex * 0.0;
      playTone(260 + reelIndex * 40, "square", 0.07, 0.12, delay);
      playNoise(0.05, 0.1, delay);
    },
    win(multiplier: number) {
      if (multiplier >= 25) {
        // jackpot: fanfarra
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((f, i) => playTone(f, "sine", 0.18, 0.22, i * 0.12));
        // shimmer noise
        for (let i = 0; i < 5; i++) playNoise(0.08, 0.07, 0.3 + i * 0.1);
      } else if (multiplier >= 6) {
        // big win
        const notes = [440, 554, 659, 880];
        notes.forEach((f, i) => playTone(f, "sine", 0.15, 0.2, i * 0.1));
      } else {
        // small win
        playTone(440, "sine", 0.1, 0.15);
        playTone(554, "sine", 0.1, 0.15, 0.1);
      }
    },
    neutral() {
      playTone(320, "sine", 0.08, 0.07);
    },
    lose() {
      playTone(180, "sawtooth", 0.12, 0.1);
      playTone(140, "sawtooth", 0.14, 0.1, 0.1);
    },
    prime,
  };
}

/* ── Reel ─────────────────────────────────────────────── */
const CELL_H_DESKTOP = 152;
const CELL_H_MOBILE  = 108;
const VISIBLE    = 3;
const STRIP_LEN  = 32;

function buildStrip(): SymbolId[] {
  return Array.from({ length: STRIP_LEN }, () => pickRandom());
}

interface ReelProps {
  spinning: boolean;
  targetSymbol: SymbolId | null;
  delay: number;
  reelIndex: number;
  cellH: number;
  onDone: (reelIndex: number) => void;
}

function Reel({ spinning, targetSymbol, delay, reelIndex, cellH, onDone }: ReelProps) {
  const stripRef  = useRef<SymbolId[]>(buildStrip());
  const [topPx, setTopPx] = useState(0);
  const rafRef    = useRef(0);
  const doneRef   = useRef(false);
  const DURATION  = 1200 + delay;
  const iconSize  = Math.round(cellH * 0.51);

  useEffect(() => {
    if (!spinning) return;
    doneRef.current = false;

    const strip = buildStrip();
    const landIdx = STRIP_LEN - 4;
    if (targetSymbol) strip[landIdx] = targetSymbol;
    stripRef.current = strip;

    const totalScroll = landIdx * cellH - cellH;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setTopPx(-(eased * totalScroll));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTopPx(-(totalScroll));
        if (!doneRef.current) { doneRef.current = true; onDone(reelIndex); }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning]); // eslint-disable-line react-hooks/exhaustive-deps

  const strip = stripRef.current;

  return (
    <div
      style={{
        width: cellH,
        height: cellH * VISIBLE,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: topPx, width: "100%" }}>
        {strip.map((id, i) => {
          const sym = SYMBOLS.find(s => s.id === id)!;
          return (
            <div
              key={i}
              style={{
                height: cellH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SymbolIcon id={sym.id} size={iconSize} color={sym.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
interface HistoryEntry { multiplier: number }

export default function SlotsPage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();
  const audio = useSlotAudio();
  const [cellH, setCellH] = useState(CELL_H_DESKTOP);
  useEffect(() => {
    const update = () => setCellH(window.innerWidth < 768 ? CELL_H_MOBILE : CELL_H_DESKTOP);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [betAmount, setBetAmount] = useState(10);
  const [spinning, setSpinning]   = useState(false);
  const [result, setResult]       = useState<{ reels: [SymbolId,SymbolId,SymbolId]; multiplier: number; label: string } | null>(null);
  const [history, setHistory]     = useState<HistoryEntry[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const pendingRef = useRef<{ reels: [SymbolId,SymbolId,SymbolId]; multiplier: number; label: string } | null>(null);
  const betRef     = useRef(betAmount);
  const balanceRef = useRef(balance);
  const spinCountRef = useRef(0);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { betRef.current = betAmount; }, [betAmount]);
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`slots_spin_count_${userId}`);
    spinCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);

  const spin = useCallback(async () => {
    if (spinning || betAmount <= 0 || betAmount > balanceRef.current) return;
    if (!userId || !username) return;
    const { adjustBalance } = await import("@/lib/supabase");
    const nb = await adjustBalance(userId, -betAmount);
    if (nb === null) return;
    balanceRef.current = nb;
    login(userId, username, nb);

    // Boost de boas-vindas: primeiras 10 apostas têm BOOST_MATCH maior (RTP ~150%)
    const isWelcome = spinCountRef.current < 10;
    const bm  = isWelcome ? WELCOME_BOOST_MATCH    : BOOST_MATCH;
    const bmm = isWelcome ? WELCOME_BOOST_MISMATCH : BOOST_MISMATCH;
    const r0 = pickSymbol(undefined, undefined, bm, bmm);
    const r1 = pickSymbol(r0, undefined, bm, bmm);
    const r2 = r0 === r1 ? pickSymbol(r1, undefined, bm, bmm) : pickSymbol(r1, r0, bm, bmm);
    const reels: [SymbolId, SymbolId, SymbolId] = [r0, r1, r2];
    const ev = evaluate(reels);
    spinCountRef.current += 1;
    if (userId) localStorage.setItem(`slots_spin_count_${userId}`, String(spinCountRef.current));
    pendingRef.current = { reels, ...ev };
    setResult(null);
    setDoneCount(0);
    audio.spinStart();
    setSpinning(true);
  }, [spinning, betAmount, userId, username, login, audio]);

  const handleDone = useCallback((reelIndex: number) => {
    audio.reelStop(reelIndex);
    setDoneCount(prev => prev + 1);
  }, [audio]);

  useEffect(() => {
    if (doneCount !== 3) return;
    const res = pendingRef.current!;
    setResult(res);
    setSpinning(false);
    if (res.multiplier > 0 && res.label !== "Par!") audio.win(res.multiplier);
    else if (res.label === "Par!") audio.neutral();
    else audio.lose();
    const payout = betRef.current * res.multiplier;
    if (payout > 0 && userId && username) {
      (async () => {
        const { adjustBalance } = await import("@/lib/supabase");
        const nb = await adjustBalance(userId, payout);
        if (nb !== null) {
          balanceRef.current = nb;
          login(userId, username, nb);
        }
      })();
    }
    setHistory(h => [{ multiplier: res.multiplier }, ...h].slice(0, 15));
  }, [doneCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPar = result ? result.label === "Par!" : false;
  const won   = result ? result.multiplier > 0 && !isPar : false;

  const Controls = (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/40">Quantia</label>
        <div className="flex items-center gap-2 rounded-[3px] px-3 py-2.5" style={{ background: PAGE_BG }}>
          <span className="text-xs font-medium text-white/40">R$</span>
          <input
            type="number" value={betAmount} disabled={spinning}
            onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
            className="w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none disabled:opacity-50"
          />
          <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))} disabled={spinning}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40">1/2</button>
          <button onClick={() => setBetAmount(v => v * 2)} disabled={spinning}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40">2x</button>
        </div>
      </div>

      {/* Payout table */}
      <div className="hidden md:block rounded-[3px] px-2 py-2" style={{ background: PAGE_BG }}>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {SYMBOLS.map(sym => (
            <div key={sym.id} className="flex items-center justify-between gap-1 px-1">
              <SymbolIcon id={sym.id} size={13} color={sym.color} />
              <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>{PAYOUTS[sym.id]}x</span>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between px-1 pt-1 border-t border-white/5">
            <span className="text-[9px] text-white/25">Par</span>
            <span className="text-[10px] font-bold text-white/35">{TWO_PAYOUT}x</span>
          </div>
        </div>
      </div>

      <motion.button
        onClick={spin}
        onMouseEnter={() => audio.prime()}
        onFocus={() => audio.prime()}
        disabled={spinning || betAmount > balance || betAmount <= 0}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center gap-2 rounded-[3px] py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
        style={{ background: ACCENT }}
      >
        <motion.span
          animate={spinning ? { rotate: 360 } : { rotate: 0 }}
          transition={spinning ? { repeat: Infinity, duration: 0.5, ease: "linear" } : {}}
        >
          <RefreshCw size={15} />
        </motion.span>
        {spinning ? "Girando..." : "Girar"}
      </motion.button>

      <div className="h-5 flex items-center justify-center">
        <AnimatePresence>
          {result && (
            <motion.p
              key={result.label + result.multiplier}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-xs font-semibold"
              style={{ color: won ? GREEN : isPar ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.25)" }}
            >
              {won
                ? `+R$ ${(betAmount * result.multiplier - betAmount).toFixed(2)}`
                : isPar ? "Par — neutro"
                : "Sem sorte"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto flex justify-between pt-2 text-xs font-medium text-white/30">
        <span>Saldo</span>
        <span className="text-white/50">R$ {balance.toFixed(2)}</span>
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: PAGE_BG }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-sm font-semibold text-white">Slots</span>
        </div>
        <span className="text-xs font-medium text-white/40">Netano Originals</span>
      </div>

      {/* Payouts mobile — barra horizontal compacta */}
      <div className="px-3 py-1.5 md:hidden" style={{ background: PANEL_BG }}>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {SYMBOLS.map(sym => (
            <div key={sym.id} className="flex shrink-0 items-center gap-1">
              <SymbolIcon id={sym.id} size={11} color={sym.color} />
              <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{PAYOUTS[sym.id]}x</span>
            </div>
          ))}
          <div className="flex shrink-0 items-center gap-1 pl-2 border-l border-white/10">
            <span className="text-[9px] text-white/25">Par</span>
            <span className="text-[10px] font-bold text-white/30">{TWO_PAYOUT}x</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Left panel */}
        <div className="hidden w-[260px] shrink-0 flex-col gap-4 p-4 md:flex" style={{ background: PANEL_BG }}>
          {Controls}
        </div>

        {/* Game area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 relative">
          {/* History desktop */}
          <div className="absolute top-4 right-6 hidden md:flex gap-2">
            {history.map((h, i) => (
              <span key={i} className="shrink-0 rounded px-2.5 py-1 text-xs font-bold"
                style={{
                  background: h.multiplier >= 2 ? "rgba(7,227,133,0.12)" : h.multiplier > 0 ? "rgba(251,191,36,0.12)" : "rgba(255,60,0,0.1)",
                  color: h.multiplier >= 2 ? GREEN : h.multiplier > 0 ? "#fbbf24" : ACCENT,
                }}>
                {h.multiplier > 0 ? `${h.multiplier}x` : "0x"}
              </span>
            ))}
          </div>

          {/* Slot machine body */}
          <div className="flex flex-col items-center gap-3">

            {/* Label */}
            <div className="flex items-center gap-2">
              <Zap size={11} color={ACCENT} fill={ACCENT} />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">Netano Slots</span>
              <Zap size={11} color={ACCENT} fill={ACCENT} />
            </div>

            {/* Reels */}
            <div className="relative overflow-hidden" style={{ borderRadius: 16 }}>
              {/* Win line */}
              <div
                className="pointer-events-none absolute left-0 right-0 z-20"
                style={{
                  top: cellH,
                  height: cellH,
                  borderTop: `1px solid ${result && won ? GREEN : result && isPar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                  borderBottom: `1px solid ${result && won ? GREEN : result && isPar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                  transition: "border-color 0.3s",
                }}
              />
              {/* Top & bottom fade */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20"
                style={{ background: `linear-gradient(to bottom, ${PAGE_BG}, transparent)` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20"
                style={{ background: `linear-gradient(to top, ${PAGE_BG}, transparent)` }} />

              <div className="flex">
                {[0, 1, 2].map(i => (
                  <Reel
                    key={i}
                    spinning={spinning}
                    targetSymbol={pendingRef.current?.reels[i] ?? null}
                    delay={i * 180}
                    reelIndex={i}
                    cellH={cellH}
                    onDone={handleDone}
                  />
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="flex items-center justify-center min-h-[28px]">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="res"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    {result.reels.map((id, i) => {
                      const sym = SYMBOLS.find(s => s.id === id)!;
                      return <SymbolIcon key={i} id={id} size={14} color={sym.color} />;
                    })}
                    <span className="text-xs font-bold ml-1" style={{ color: won ? GREEN : isPar ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)" }}>
                      {won ? `+R$ ${(betAmount * result.multiplier - betAmount).toFixed(2)}` : isPar ? "— neutro —" : "sem sorte"}
                    </span>
                  </motion.div>
                ) : (
                  <motion.span key="idle" className="text-[10px] text-white/15">— boa sorte —</motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile bottom panel */}
        <div className="flex flex-col gap-3 p-4 md:hidden" style={{ background: PANEL_BG }}>
          {Controls}
        </div>
      </div>
    </div>
  );
}
