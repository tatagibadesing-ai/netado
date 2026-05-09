"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { playClick, playLose, playWin } from "@/lib/sfx";

const ACCENT_RED = "#FF3C00";
const TRACK_GREEN_WIN = "#07E385";
const PAGE_BG = "#0d0d0d";
const PANEL_BG = "#111";
const INPUT_BG = "#161616";

function DiceBackdrop() {
  const pips = [
    { left: "16%", top: "16%" },
    { right: "16%", top: "16%" },
    { left: "16%", bottom: "16%" },
    { right: "16%", bottom: "16%" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-[61%] h-[255px] w-[255px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[34px] opacity-[0.22] md:top-[61%] md:h-[300px] md:w-[300px] md:rounded-[44px]"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.09) 52%, rgba(255,255,255,0.045))",
        }}
      >
        {pips.map((style, i) => (
          <span
            key={i}
            className="absolute h-16 w-16 rounded-full md:h-[82px] md:w-[82px]"
            style={{
              ...style,
              background: "rgba(255,255,255,0.34)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function calcMultiplier(winChance: number): number {
  // RTP 110% — multiplier = 110/winChance
  return Math.round((110 / winChance) * 100) / 100;
}

function DiceSlider({
  rollOver,
  onChange,
  disabled,
  result,
  phase,
}: {
  rollOver: number;
  onChange: (v: number) => void;
  disabled: boolean;
  result: number | null;
  phase: "idle" | "rolling" | "won" | "lost";
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(pct * 100) / 100);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, onChange],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons !== 1 || disabled) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(pct * 100) / 100);
    },
    [disabled, onChange],
  );

  const won = phase === "won";
  const lost = phase === "lost";

  return (
    <div className="w-full select-none">
      <div className="mb-3 flex justify-between md:mb-4">
        {[0, 25, 50, 75, 100].map((v) => (
          <span
            key={v}
            className="rounded-[3px] bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-white/55 md:px-3 md:text-xs"
          >
            {v}
          </span>
        ))}
      </div>
      <div
        ref={trackRef}
        className="relative h-8 cursor-pointer overflow-visible rounded-[4px] p-1.5 md:h-9"
        style={{
          background: "#2a343a",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        onPointerDown={handlePointer}
        onPointerMove={handleMove}
      >
        <div
          className="absolute bottom-1.5 left-1.5 top-1.5 rounded-l-[2px]"
          style={{
            width: `calc(${rollOver}% - 6px)`,
            background: ACCENT_RED,
            opacity: lost ? 1 : 0.96,
          }}
        />
        <div
          className="absolute bottom-1.5 top-1.5 rounded-r-[2px]"
          style={{
            left: `${rollOver}%`,
            right: 6,
            background: won ? TRACK_GREEN_WIN : TRACK_GREEN_WIN,
            opacity: won ? 1 : 0.96,
          }}
        />
        <AnimatePresence>
          {result !== null && (
            <motion.div
              key={`dice-result-${result}`}
              initial={{
                left: `${rollOver}%`,
                opacity: 0,
                rotate: -18,
                scale: 0.55,
                x: "-50%",
                y: -14,
              }}
              animate={{
                left: `${result}%`,
                opacity: 1,
                rotate: 45,
                scale: 1,
                x: "-50%",
                y: -68,
              }}
              exit={{ opacity: 0, scale: 0.6, y: -46 }}
              transition={{ type: "spring", stiffness: 210, damping: 17, mass: 0.8 }}
              className="absolute top-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-[11px] border-[5px] bg-white shadow-lg md:h-14 md:w-14 md:rounded-[12px] md:border-[6px]"
              style={{
                borderColor: won ? TRACK_GREEN_WIN : ACCENT_RED,
                boxShadow: won
                  ? "0 0 22px rgba(7,227,133,0.42)"
                  : "0 0 22px rgba(255,60,0,0.42)",
              }}
            >
              <span className="-rotate-45 text-sm font-black tabular-nums md:text-base" style={{ color: won ? TRACK_GREEN_WIN : ACCENT_RED }}>
                {Math.round(result)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${rollOver}%` }}
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md md:h-12 md:w-12"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
          >
            <div className="h-5 w-2 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

type Phase = "idle" | "rolling" | "won" | "lost";

export default function DicePage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();

  const [betAmount, setBetAmount] = useState(10);
  const [rollOver, setRollOver] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<{ value: number; won: boolean }[]>([
    { value: 39.44, won: true },
    { value: 34.41, won: true },
    { value: 52.43, won: true },
  ]);

  const winChance = 100 - rollOver;
  const multiplier = calcMultiplier(winChance);
  const isRolling = phase === "rolling";

  const handleRollOverChange = (v: number) => setRollOver(Math.min(98, Math.max(2, v)));

  const handleMultiplierChange = (raw: string) => {
    const m = parseFloat(raw.replace(",", "."));
    if (!isNaN(m) && m >= 1.12) {
      const wc = 110 / m;
      setRollOver(Math.min(98, Math.max(2, Math.round((100 - wc) * 100) / 100)));
    }
  };

  const handleWinChanceChange = (raw: string) => {
    const wc = parseFloat(raw.replace(",", "."));
    if (!isNaN(wc) && wc > 0 && wc < 98)
      setRollOver(Math.min(98, Math.max(2, Math.round((100 - wc) * 100) / 100)));
  };

  const roll = async () => {
    if (isRolling || betAmount <= 0 || betAmount > balance) return;
    if (!userId || !username) return;
    const { adjustBalance } = await import("@/lib/supabase");
    const nbDebit = await adjustBalance(userId, -betAmount);
    if (nbDebit === null) return;
    login(userId, username, nbDebit);
    setPhase("rolling");
    setResult(null);
    playClick();
    await new Promise((r) => setTimeout(r, 500));
    const rolled = Math.round(Math.random() * 10000) / 100;
    const won = rolled > rollOver;
    setResult(rolled);
    setPhase(won ? "won" : "lost");
    setHistory((h) => [{ value: rolled, won }, ...h].slice(0, 20));
    if (won) {
      playWin();
      const payout = betAmount * multiplier;
      const nbCredit = await adjustBalance(userId, payout);
      if (nbCredit !== null) login(userId, username, nbCredit);
    } else {
      playLose();
    }
  };

  const HistoryBar = (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      <AnimatePresence>
        {history.map((h, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 rounded-[4px] px-3 py-2 text-xs font-bold tabular-nums text-white"
            style={{
              background: h.won ? TRACK_GREEN_WIN : ACCENT_RED,
            }}
          >
            {h.value.toFixed(2)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const GameArea = (
    <div
      className="relative flex min-h-[320px] flex-none flex-col overflow-hidden md:flex-1"
      style={{ background: PAGE_BG }}
    >
      <div className="absolute right-10 top-10 z-20 hidden md:block">
        {HistoryBar}
      </div>
      <div className="relative z-10 flex min-h-[335px] flex-none flex-col items-center justify-center gap-5 px-5 py-8 md:min-h-0 md:flex-1 md:gap-6 md:px-10 md:py-16">
        <DiceBackdrop />
        <div className="relative z-10 flex h-16 items-center justify-center md:h-20">
          <AnimatePresence mode="wait">
            {phase === "rolling" ? (
              <motion.div
                key="rolling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-white/30"
              >
                Rolando...
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="relative z-10 w-full max-w-[760px]">
          <DiceSlider
            rollOver={rollOver}
            onChange={handleRollOverChange}
            disabled={isRolling}
            result={result}
            phase={phase}
          />
        </div>
      </div>
      <div className="relative z-10 hidden grid-cols-3 gap-6 px-6 py-4 md:grid" style={{ background: PANEL_BG }}>
        {[
          { label: "MULTIPLIER", value: multiplier.toFixed(4).replace(".", ","), suffix: "x", onChange: handleMultiplierChange },
          { label: "ROLL OVER", value: rollOver.toFixed(2).replace(".", ","), suffix: "refresh", onChange: (v: string) => handleRollOverChange(parseFloat(v.replace(",", "."))) },
          { label: "WIN CHANCE", value: winChance.toFixed(4).replace(".", ","), suffix: "%", onChange: handleWinChanceChange },
        ].map(({ label, value, suffix, onChange }) => (
          <div key={label} className="min-w-0">
            <p className="mb-2 truncate text-[8px] font-bold uppercase text-white/35 min-[390px]:text-[9px] md:text-[11px]">{label}</p>
            <div
              className="flex h-11 items-center gap-1.5 rounded-[3px] px-2 md:h-14 md:gap-2 md:px-4"
              style={{ background: PAGE_BG }}
            >
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={isRolling}
                className="w-0 flex-1 bg-transparent text-xs font-bold text-white outline-none disabled:opacity-50 md:text-sm"
              />
              {suffix === "refresh" ? (
                <RefreshCw size={13} className="shrink-0 text-white/40 md:size-[15px]" />
              ) : (
                <span className="shrink-0 text-xs font-bold text-white/35 md:text-base">{suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between px-6 py-3" style={{ background: PANEL_BG }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-sm font-semibold text-white">Dice</span>
        </div>
        <span className="text-xs font-medium text-white/40">Netano Originals</span>
      </div>

      <div className="px-4 py-2 md:hidden" style={{ background: PANEL_BG }}>
        {HistoryBar}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div
          className="hidden w-[260px] shrink-0 flex-col gap-4 p-4 md:flex"
          style={{ background: PANEL_BG }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">Quantia</label>
            <div className="flex items-center gap-2 rounded-[3px] px-3 py-2.5" style={{ background: PAGE_BG }}>
              <span className="text-xs font-medium text-white/40">R$</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                disabled={isRolling}
                className="w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none disabled:opacity-50"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => setBetAmount((v) => Math.max(1, Math.floor(v / 2)))}
                  disabled={isRolling}
                  className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
                >
                  1/2
                </button>
                <button
                  onClick={() => setBetAmount((v) => v * 2)}
                  disabled={isRolling}
                  className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
                >
                  2x
                </button>
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {phase !== "idle" && result !== null && (
              <motion.div
                key={result}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[3px] p-4 text-center"
                style={{ background: INPUT_BG }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-15"
                  style={{
                    background:
                      phase === "won"
                        ? `radial-gradient(ellipse at 50% 0%, ${TRACK_GREEN_WIN} 0%, transparent 70%)`
                        : `radial-gradient(ellipse at 50% 0%, ${ACCENT_RED} 0%, transparent 70%)`,
                  }}
                />
                <p className="mb-1 text-xs font-medium text-white/40">
                  {phase === "won" ? "Ganhou!" : "Perdeu!"}
                </p>
                <p className="text-3xl font-semibold" style={{ color: phase === "won" ? TRACK_GREEN_WIN : ACCENT_RED }}>
                  {result.toFixed(2)}
                </p>
                {phase === "won" && (
                  <p className="mt-1 text-sm font-semibold" style={{ color: TRACK_GREEN_WIN }}>
                    +R$ {(betAmount * multiplier - betAmount).toFixed(2)}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-auto">
            <motion.button
              onClick={roll}
              disabled={isRolling || betAmount > balance || betAmount <= 0}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-center gap-2 rounded-[3px] py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: ACCENT_RED }}
            >
              <motion.span
                animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
                transition={isRolling ? { repeat: Infinity, duration: 0.6, ease: "linear" } : {}}
              >
                <RefreshCw size={15} />
              </motion.span>
              {isRolling ? "Rolando..." : "Rolar"}
            </motion.button>
          </div>
          <div className="flex justify-between pt-3 text-xs font-medium text-white/30">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        {GameArea}

        <div className="mt-auto flex flex-col gap-3 px-3 pb-6 pt-3 md:hidden" style={{ background: PANEL_BG }}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "MULTIPLIER", value: multiplier.toFixed(4).replace(".", ","), suffix: "x", onChange: handleMultiplierChange },
              { label: "ROLL OVER", value: rollOver.toFixed(2).replace(".", ","), suffix: "refresh", onChange: (v: string) => handleRollOverChange(parseFloat(v.replace(",", "."))) },
              { label: "WIN CHANCE", value: winChance.toFixed(4).replace(".", ","), suffix: "%", onChange: handleWinChanceChange },
            ].map(({ label, value, suffix, onChange }) => (
              <div key={label} className="min-w-0">
                <p className="mb-2 truncate text-[8px] font-bold uppercase text-white/35 min-[390px]:text-[9px]">{label}</p>
                <div className="flex h-11 items-center gap-1.5 rounded-[3px] px-2" style={{ background: PAGE_BG }}>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={isRolling}
                    className="w-0 flex-1 bg-transparent text-xs font-bold text-white outline-none disabled:opacity-50"
                  />
                  {suffix === "refresh" ? (
                    <RefreshCw size={13} className="shrink-0 text-white/40" />
                  ) : (
                    <span className="shrink-0 text-xs font-bold text-white/35">{suffix}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-white/40">Quantia</label>
              <div className="flex items-center gap-1.5 rounded-[3px] px-2.5 py-2" style={{ background: PAGE_BG }}>
                <span className="text-xs text-white/40">R$</span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                  disabled={isRolling}
                  className="w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => setBetAmount((v) => Math.max(1, Math.floor(v / 2)))}
                  disabled={isRolling}
                  className="rounded-[3px] bg-white/5 px-1.5 py-0.5 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
                >
                  1/2
                </button>
                <button
                  onClick={() => setBetAmount((v) => v * 2)}
                  disabled={isRolling}
                  className="rounded-[3px] bg-white/5 px-1.5 py-0.5 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
                >
                  2x
                </button>
              </div>
            </div>
          </div>
          <motion.button
            onClick={roll}
            disabled={isRolling || betAmount > balance || betAmount <= 0}
            whileTap={{ scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-[3px] py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: ACCENT_RED }}
          >
            <motion.span
              animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
              transition={isRolling ? { repeat: Infinity, duration: 0.6, ease: "linear" } : {}}
            >
              <RefreshCw size={15} />
            </motion.span>
            {isRolling ? "Rolando..." : "Rolar"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
