"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, X, BarChart2 } from "lucide-react";
import { playBetPlaced, playCashout, playExplosion, playLose, playSpinTick } from "@/lib/sfx";

type CrashPhase = "waiting" | "running" | "crashed";
interface HistoryEntry { multiplier: number; }

function useCrashGame(isWelcome: () => boolean) {
  const [phase, setPhase] = useState<CrashPhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { multiplier: 1.03 }, { multiplier: 1.00 }, { multiplier: 1.41 },
    { multiplier: 2.26 }, { multiplier: 2.42 }, { multiplier: 1.98 },
    { multiplier: 4.72 }, { multiplier: 1.00 }, { multiplier: 1.09 },
  ]);
  const [countdown, setCountdown] = useState(5);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const crashAtRef = useRef<number>(1);

  const generateCrashPoint = () => {
    // Welcome: RTP 130% (crash 1.30/u). Normal: RTP 105% (crash 1.05/u).
    const numerator = isWelcome() ? 1.30 : 1.05;
    const u = Math.random();
    return Math.max(1.01, numerator / Math.max(u, 0.001));
  };

  const startRound = useCallback(() => {
    crashAtRef.current = generateCrashPoint();
    setMultiplier(1.0);
    setPhase("running");
    startTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const m = Math.pow(Math.E, 0.12 * elapsed);
      if (m >= crashAtRef.current) {
        setMultiplier(crashAtRef.current);
        setPhase("crashed");
        setHistory(h => [{ multiplier: crashAtRef.current }, ...h].slice(0, 12));
        return;
      }
      setMultiplier(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const scheduleNext = useCallback(() => {
    setCountdown(5);
    setPhase("waiting");
    let cd = 5;
    const iv = setInterval(() => {
      cd -= 1;
      setCountdown(cd);
      if (cd <= 0) { clearInterval(iv); startRound(); }
    }, 1000);
  }, [startRound]);

  useEffect(() => {
    if (phase === "crashed") {
      const t = setTimeout(scheduleNext, 3000);
      return () => clearTimeout(t);
    }
  }, [phase, scheduleNext]);

  useEffect(() => {
    scheduleNext();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return { phase, multiplier, history, countdown };
}

function CrashChart({ phase, multiplier }: { phase: CrashPhase; multiplier: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = wrapper.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [dpr]);

  useEffect(() => {
    if (phase === "running") {
      pointsRef.current = [];
      startTimeRef.current = Date.now();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "running") {
      pointsRef.current.push({ x: (Date.now() - startTimeRef.current) / 1000, y: multiplier });
    }
  }, [multiplier, phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pad = { left: 48, right: 20, top: 20, bottom: 36 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const maxM = Math.max(multiplier * 1.15, 1.5);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + innerH - (i / 4) * innerH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText((1 + (i / 4) * (maxM - 1)).toFixed(2) + "x", pad.left - 6, y + 4);
    }
    if (pointsRef.current.length < 2) { ctx.restore(); return; }
    const maxX = Math.max(pointsRef.current[pointsRef.current.length - 1].x, 6);
    const toC = (px: number, py: number) => ({
      cx: pad.left + (px / maxX) * innerW,
      cy: pad.top + innerH - ((py - 1) / (maxM - 1)) * innerH,
    });
    const lineColor = phase === "crashed" ? "#ef4444" : "#FF3C00";
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + innerH);
    grad.addColorStop(0, phase === "crashed" ? "rgba(239,68,68,0.3)" : "rgba(255,60,0,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    const first = toC(pointsRef.current[0].x, pointsRef.current[0].y);
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + innerH);
    ctx.lineTo(first.cx, first.cy);
    for (let i = 1; i < pointsRef.current.length; i++) {
      const p = toC(pointsRef.current[i].x, pointsRef.current[i].y);
      ctx.lineTo(p.cx, p.cy);
    }
    const last = toC(pointsRef.current[pointsRef.current.length - 1].x, pointsRef.current[pointsRef.current.length - 1].y);
    ctx.lineTo(last.cx, pad.top + innerH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(first.cx, first.cy);
    for (let i = 1; i < pointsRef.current.length; i++) {
      const p = toC(pointsRef.current[i].x, pointsRef.current[i].y);
      ctx.lineTo(p.cx, p.cy);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(last.cx, last.cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = lineColor + "33";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.cx, last.cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= Math.ceil(maxX); i += 2) {
      ctx.fillText(`${i}s`, pad.left + (i / maxX) * innerW, H - 10);
    }
    ctx.restore();
  });

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

export default function CrashPage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();
  const betCountRef = useRef(0);
  const betActiveRef = useRef(false);
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`crash_bet_count_${userId}`);
    betCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);
  const isWelcome = useCallback(() => {
    return betActiveRef.current && betCountRef.current <= 10;
  }, []);
  const { phase, multiplier, history, countdown } = useCrashGame(isWelcome);
  const [betAmount, setBetAmount] = useState(10);
  const [autoWithdraw, setAutoWithdraw] = useState("");
  const [betActive, setBetActive] = useState(false);
  useEffect(() => { betActiveRef.current = betActive; }, [betActive]);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const prevPhase = useRef<CrashPhase>("waiting");

  const handleBet = async () => {
    if (phase !== "waiting") return;
    if (betActive) return;
    if (betAmount <= 0 || betAmount > balance) return;
    betCountRef.current += 1;
    if (userId) localStorage.setItem(`crash_bet_count_${userId}`, String(betCountRef.current));
    betActiveRef.current = true;
    setCashedOut(null);
    setBetActive(true);
    playBetPlaced();
    const newBalance = balance - betAmount;
    login(userId!, username!, newBalance);
    if (userId) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId);
    }
  };

  const cashOut = async (mult: number) => {
    const winnings = betAmount * mult;
    const newBalance = balance + winnings;
    setCashedOut(mult);
    setBetActive(false);
    playCashout();
    login(userId!, username!, newBalance);
    if (userId) {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("netano_profiles").update({ balance: newBalance }).eq("id", userId);
    }
  };

  const handleCashOut = () => {
    if (!betActive || phase !== "running") return;
    cashOut(multiplier);
  };

  useEffect(() => {
    if (prevPhase.current !== "crashed" && phase === "crashed") {
      playExplosion();
      if (betActive && cashedOut === null) {
        setTimeout(() => playLose(), 220);
        setBetActive(false);
      }
    }
    prevPhase.current = phase;
  }, [phase, betActive, cashedOut]);

  useEffect(() => {
    if (phase === "waiting" && countdown > 0 && countdown <= 3) {
      playSpinTick();
    }
  }, [countdown, phase]);

  useEffect(() => {
    if (phase === "running" && betActive && cashedOut === null && autoWithdraw) {
      const target = parseFloat(autoWithdraw);
      if (!isNaN(target) && multiplier >= target) cashOut(multiplier);
    }
  }, [multiplier, phase, betActive, cashedOut, autoWithdraw]);

  const multiplierColor = phase === "crashed" ? "#ef4444"
    : multiplier >= 3 ? "#22c55e"
    : multiplier >= 2 ? "#eab308"
    : "#FF3C00";

  /* ── History pills (shared) ── */
  const HistoryBar = (
    <div className="flex gap-1.5 flex-wrap">
      {history.map((h, i) => (
        <span key={i} className="px-2.5 py-1 rounded text-xs font-semibold"
          style={{
            background: h.multiplier >= 2 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
            color: h.multiplier >= 2 ? "#22c55e" : "#ef4444",
          }}>
          {h.multiplier.toFixed(2)}X
        </span>
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
          <span className="text-white text-sm font-semibold">Crash</span>
        </div>
        <span className="text-white/40 text-xs font-medium">Netano Originals</span>
      </div>

      {/* History — mobile only (top bar) */}
      <div className="md:hidden px-4 py-2 bg-[#111] border-b border-white/5">
        {HistoryBar}
      </div>

      {/* Main */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Left panel — desktop */}
        <div className="hidden md:flex w-[260px] shrink-0 bg-[#111] border-r border-white/5 flex-col p-4 gap-4">
          <div>
            <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
            <div className="flex items-center gap-2 bg-[#0d0d0d] rounded px-3 py-2.5 border border-white/5">
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
            <label className="text-xs text-white/40 font-medium block mb-1.5">Auto Retirar</label>
            <div className="flex items-center gap-2 bg-[#0d0d0d] rounded px-3 py-2.5 border border-white/5">
              <input type="number" placeholder="0.00" value={autoWithdraw}
                onChange={e => setAutoWithdraw(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0 placeholder:text-white/20" />
              {autoWithdraw && (
                <button onClick={() => setAutoWithdraw("")} className="text-white/30 hover:text-white/60">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            {!betActive ? (
              <button onClick={handleBet}
                disabled={betAmount > balance || betAmount <= 0 || phase === "running"}
                className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ background: "#FF3C00" }}>
                {phase === "running" ? "Aguarde próxima rodada" : "Começar o jogo"}
              </button>
            ) : phase === "running" ? (
              <button onClick={handleCashOut}
                className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all active:scale-95"
                style={{ background: "#22c55e" }}>
                Retirar {multiplier.toFixed(2)}x
              </button>
            ) : (
              <button disabled className="w-full py-3.5 rounded text-white/40 text-sm font-medium bg-[#1a1a1a] cursor-not-allowed">
                Aguardando...
              </button>
            )}
            {cashedOut !== null && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-center text-green-400 text-xs font-medium">
                Retirado em {cashedOut.toFixed(2)}x — +R$ {(betAmount * cashedOut).toFixed(2)}
              </motion.p>
            )}
          </div>
          <div className="flex justify-between text-xs text-white/30 font-medium border-t border-white/5 pt-3">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Right: chart + history (desktop) / chart only (mobile) */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] min-w-0 min-h-[260px]">
          <div className="flex-1 relative select-none" style={{ pointerEvents: "none" }}>
            <CrashChart phase={phase} multiplier={multiplier} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {phase === "waiting" && (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <p className="text-white/40 text-sm font-medium mb-1">Próxima rodada em</p>
                  <p className="text-white font-bold tabular-nums" style={{ fontSize: "3.5rem" }}>{countdown}s</p>
                </motion.div>
              )}
              {phase === "running" && (
                <motion.div key="mult" initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                  className="text-center bg-black/25 backdrop-blur-sm rounded px-8 py-4">
                  <p className="font-bold tabular-nums" style={{ fontSize: "4rem", color: multiplierColor }}>
                    {multiplier.toFixed(2)}X
                  </p>
                </motion.div>
              )}
              {phase === "crashed" && (
                <motion.div key="crashed" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center">
                  <p className="text-red-500 text-lg font-semibold mb-1">Crashed!</p>
                  <p className="text-red-400 font-bold tabular-nums" style={{ fontSize: "3.5rem" }}>
                    {multiplier.toFixed(2)}X
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* History — desktop only (bottom of chart area) */}
          <div className="hidden md:block px-5 py-3 border-t border-white/5 bg-[#111]">
            <p className="text-xs text-white/30 font-medium mb-2">Anterior</p>
            {HistoryBar}
          </div>
        </div>

        {/* Bottom panel — mobile only */}
        <div className="md:hidden bg-[#111] flex flex-col gap-3 p-4 border-t border-white/5">
          <div className="flex gap-2">
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
            <div className="flex-1">
              <label className="text-xs text-white/40 font-medium block mb-1.5">Auto Retirar</label>
              <div className="flex items-center gap-1.5 bg-[#0d0d0d] rounded px-2.5 py-2">
                <input type="number" placeholder="0.00" value={autoWithdraw}
                  onChange={e => setAutoWithdraw(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0 placeholder:text-white/20" />
                {autoWithdraw && (
                  <button onClick={() => setAutoWithdraw("")} className="text-white/30 hover:text-white/60">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!betActive ? (
              <button onClick={handleBet}
                disabled={betAmount > balance || betAmount <= 0 || phase === "running"}
                className="w-full py-3 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ background: "#FF3C00" }}>
                {phase === "running" ? "Aguarde próxima rodada" : "Começar o jogo"}
              </button>
            ) : phase === "running" ? (
              <button onClick={handleCashOut}
                className="w-full py-3 rounded text-white text-sm font-semibold transition-all active:scale-95"
                style={{ background: "#22c55e" }}>
                Retirar {multiplier.toFixed(2)}x
              </button>
            ) : (
              <button disabled className="w-full py-3 rounded text-white/40 text-sm font-medium bg-[#1a1a1a] cursor-not-allowed">
                Aguardando...
              </button>
            )}
            {cashedOut !== null && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-center text-green-400 text-xs font-medium">
                Retirado em {cashedOut.toFixed(2)}x — +R$ {(betAmount * cashedOut).toFixed(2)}
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
