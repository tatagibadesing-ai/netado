"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, ChevronDown, Gem, Bomb } from "lucide-react";
import { playBetPlaced, playCashout, playExplosion, playReveal, playWin } from "@/lib/sfx";

/* ── Constants ───────────────────────────────────────── */

const GRID = 25; // 5x5

type CellState = "hidden" | "diamond" | "mine" | "mine-safe";
type GamePhase = "idle" | "playing" | "won" | "dead";

/* ── Multiplier table (RTP 110%) ─────────────────────── */
// Multiplicador = 1.10 / P(sobreviver) — jogador tem 10% de vantagem
function calcMultiplier(mines: number, revealed: number): number {
  let prob = 1;
  for (let i = 0; i < revealed; i++) {
    prob *= (GRID - mines - i) / (GRID - i);
  }
  return prob > 0 ? Math.round((1.10 / prob) * 100) / 100 : 1;
}


/* ── Mine Count Select ───────────────────────────────── */

const MINE_OPTIONS = [1,2,3,4,5,6,8,10,12,15,20,24];

function MineSelect({ value, onChange, disabled, openUpward = false }: {
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
  openUpward?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between bg-[#0d0d0d] text-white text-sm font-semibold rounded px-3 py-2.5 outline-none disabled:opacity-50 cursor-pointer"
      >
        <span>{value} {value === 1 ? "mina" : "minas"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} className="text-white/40" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 6, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: 4, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: openUpward ? "bottom" : "top", maxHeight: "220px" }}
            className={`absolute z-[200] left-0 right-0 bg-[#1a1a1a] rounded-lg shadow-xl border border-white/5 overflow-y-auto ${
              openUpward ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {MINE_OPTIONS.map(n => (
              <motion.li
                key={n}
                whileHover={{ backgroundColor: "rgba(255,60,0,0.12)" }}
                onClick={() => { onChange(n); setOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                  n === value ? "text-[#FF3C00] font-semibold" : "text-white/80 font-medium"
                }`}
              >
                <span>{n} {n === 1 ? "mina" : "minas"}</span>
                {n === value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3C00]" />
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Cell ────────────────────────────────────────────── */

function Cell({ state, onClick, disabled }: {
  state: CellState;
  onClick: () => void;
  disabled: boolean;
}) {
  const bg =
    state === "hidden"    ? "#1e2535" :
    state === "diamond"   ? "#0d1e35" :
    state === "mine"      ? "#3a0d0d" :
    /* mine-safe */         "#1a1a1a";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.92 } : {}}
      className="relative flex items-center justify-center rounded-md cursor-pointer transition-colors w-full h-full"
      style={{ background: bg }}
    >
      <AnimatePresence>
        {state === "hidden" && (
          <motion.div key="hidden" className="absolute inset-0 rounded-md"
            style={{ background: "#1e2535" }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          />
        )}
        {state === "diamond" && (
          <motion.div key="diamond"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center justify-center"
          >
            <Gem size={64} color="#4fc3f7" strokeWidth={1.5} />
          </motion.div>
        )}
        {state === "mine" && (
          <motion.div key="mine"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="flex items-center justify-center"
          >
            <Bomb size={64} color="#ff4444" strokeWidth={1.5} />
          </motion.div>
        )}
        {state === "mine-safe" && (
          <motion.div key="mine-safe"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="flex items-center justify-center"
          >
            <Bomb size={64} color="#aaaaaa" strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover glow on hidden */}
      {state === "hidden" && !disabled && (
        <div className="absolute inset-0 rounded-md opacity-0 hover:opacity-100 transition-opacity"
          style={{ background: "rgba(79,195,247,0.06)" }} />
      )}
    </motion.button>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function MinesPage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();

  const [mineCount, setMineCount] = useState(3);
  const [betAmount, setBetAmount] = useState(10);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [cells, setCells] = useState<CellState[]>(Array(GRID).fill("hidden"));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(0);
  const gameCountRef = useRef(0);
  const isWelcomeGameRef = useRef(false);
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`mines_game_count_${userId}`);
    gameCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);
  const [currentMult, setCurrentMult] = useState(1);

  const safeCells = GRID - mineCount;

  const startGame = async () => {
    if (betAmount <= 0 || betAmount > balance) return;
    if (!userId || !username) return;

    // Atomic debit on the server (multi-tab safe)
    const { adjustBalance } = await import("@/lib/supabase");
    const nb = await adjustBalance(userId, -betAmount);
    if (nb === null) return;
    login(userId, username, nb);

    // Gera posições das minas aleatoriamente
    const mines = new Set<number>();
    while (mines.size < mineCount) {
      mines.add(Math.floor(Math.random() * GRID));
    }

    // Marca esta partida como welcome (8 primeiras partidas) — primeira célula clicada será segura
    isWelcomeGameRef.current = gameCountRef.current < 8;
    gameCountRef.current += 1;
    if (userId) localStorage.setItem(`mines_game_count_${userId}`, String(gameCountRef.current));

    setMinePositions(mines);
    setCells(Array(GRID).fill("hidden"));
    setRevealed(0);
    setCurrentMult(calcMultiplier(mineCount, 0));
    setPhase("playing");
    playBetPlaced();
  };

  const revealCell = (index: number) => {
    if (phase !== "playing" || cells[index] !== "hidden") return;

    let mineSet = minePositions;
    // Welcome: primeira célula clicada da partida sempre é diamante.
    // Se calhou de ter mina, move ela para outra célula livre.
    if (isWelcomeGameRef.current && revealed === 0 && mineSet.has(index)) {
      const newMines = new Set(mineSet);
      newMines.delete(index);
      // achar célula livre (não selecionada e não mina)
      const candidates: number[] = [];
      for (let i = 0; i < GRID; i++) {
        if (i !== index && !newMines.has(i)) candidates.push(i);
      }
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      newMines.add(target);
      mineSet = newMines;
      setMinePositions(newMines);
    }

    const isMine = mineSet.has(index);
    const newCells = [...cells];

    if (isMine) {
      // Revela todas as minas
      newCells[index] = "mine";
      mineSet.forEach(pos => { if (pos !== index) newCells[pos] = "mine"; });
      setCells(newCells);
      setPhase("dead");
      playExplosion();
    } else {
      newCells[index] = "diamond";
      const newRevealed = revealed + 1;
      setCells(newCells);
      setRevealed(newRevealed);
      setCurrentMult(calcMultiplier(mineCount, newRevealed));
      playReveal();

      // Auto-ganhou se revelou todos os seguros
      if (newRevealed === safeCells) {
        cashOut(newCells, newRevealed);
      }
    }
  };

  const cashOut = useCallback(async (currentCells?: CellState[], rev?: number) => {
    if (phase !== "playing" && !currentCells) return;
    const revCount = rev ?? revealed;
    if (revCount === 0) return;

    const mult = calcMultiplier(mineCount, revCount);
    const winnings = betAmount * mult;

    // Reveal mine positions as "mine-safe"
    setCells(prev => {
      const base = currentCells ?? prev;
      return base.map((c, i) =>
        c === "hidden" && minePositions.has(i) ? "mine-safe" : c
      );
    });

    setPhase("won");
    playCashout();
    setTimeout(() => playWin(), 150);
    if (!userId || !username) return;
    const { adjustBalance } = await import("@/lib/supabase");
    const nb = await adjustBalance(userId, winnings);
    if (nb !== null) login(userId, username, nb);
  }, [phase, revealed, mineCount, betAmount, userId, username, login, minePositions]);

  const reset = () => {
    setPhase("idle");
    setCells(Array(GRID).fill("hidden"));
    setRevealed(0);
    setMinePositions(new Set());
    setCurrentMult(1);
  };

  const isPlaying = phase === "playing";
  const isDead = phase === "dead";
  const isWon = phase === "won";
  const isIdle = phase === "idle";

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0d] min-h-0">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm font-semibold">Mines</span>
        </div>
        <span className="text-white/40 text-xs font-medium">Netano Originals</span>
      </div>

      {/* Main */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

        {/* Left panel — desktop only */}
        <div className="hidden md:flex w-[260px] shrink-0 bg-[#111] flex-col p-4 gap-4">
          <div>
            <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
            <div className="flex items-center gap-2 bg-[#0d0d0d] rounded px-3 py-2.5">
              <span className="text-white/40 text-xs font-medium">R$</span>
              <input type="number" value={betAmount}
                onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                disabled={isPlaying}
                className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0 disabled:opacity-50" />
              <div className="flex gap-1">
                <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))} disabled={isPlaying}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors disabled:opacity-40">½</button>
                <button onClick={() => setBetAmount(v => v * 2)} disabled={isPlaying}
                  className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors disabled:opacity-40">2x</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium block mb-1.5">Número de Minas</label>
            <MineSelect value={mineCount} onChange={setMineCount} disabled={isPlaying} />
          </div>
          <AnimatePresence>
            {isPlaying && revealed > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded p-4 text-center relative overflow-hidden" style={{ background: "#161616" }}>
                <div className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, #22c55e 0%, transparent 70%)" }} />
                <p className="text-xs text-white/40 font-medium mb-2">Multiplicador atual</p>
                <p className="text-3xl font-semibold leading-none" style={{ color: "#22c55e" }}>x{currentMult.toFixed(2)}</p>
                <div className="mt-3 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>R$ {(betAmount * currentMult).toFixed(2)}</p>
                  <p className="text-xs text-white/30 font-medium">+R$ {(betAmount * currentMult - betAmount).toFixed(2)} lucro</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-auto flex flex-col gap-2">
            {isIdle || isDead || isWon ? (
              <button onClick={isDead || isWon ? reset : startGame} disabled={betAmount > balance || betAmount <= 0}
                className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "#FF3C00" }}>
                {isDead ? "Jogar Novamente" : isWon ? "Jogar Novamente" : "Começar o jogo"}
              </button>
            ) : (
              <button onClick={() => cashOut()} disabled={revealed === 0}
                className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "#22c55e" }}>
                Retirar x{currentMult.toFixed(2)} — R$ {(betAmount * currentMult).toFixed(2)}
              </button>
            )}
            <AnimatePresence>
              {isDead && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-red-400 text-xs font-medium">Você pisou numa mina! Perdeu R$ {betAmount.toFixed(2)}</motion.p>}
              {isWon && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-green-400 text-xs font-medium">Ganhou! +R$ {(betAmount * currentMult).toFixed(2)}</motion.p>}
            </AnimatePresence>
          </div>
          <div className="flex justify-between text-xs text-white/30 font-medium pt-3">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Right: grid */}
        <div className="flex-1 flex items-center justify-center p-4 bg-[#0d0d0d] min-h-[280px]">
          <div className="w-full h-full max-h-full" style={{ aspectRatio: "1", maxWidth: "min(98%, calc(100vh - 200px))" }}>
            <div className="grid gap-2 h-full" style={{ gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(5, 1fr)" }}>
              {cells.map((state, i) => (
                <Cell key={i} state={state} onClick={() => revealCell(i)} disabled={!isPlaying || state !== "hidden"} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom panel — mobile only */}
        <div className="md:hidden bg-[#111] flex flex-col gap-3 p-4 border-t border-white/5 overflow-visible">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
              <div className="flex items-center gap-1.5 bg-[#0d0d0d] rounded px-2.5 py-2">
                <span className="text-white/40 text-xs">R$</span>
                <input type="number" value={betAmount}
                  onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                  disabled={isPlaying}
                  className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0 disabled:opacity-50" />
                <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))} disabled={isPlaying}
                  className="text-xs px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium disabled:opacity-40">½</button>
                <button onClick={() => setBetAmount(v => v * 2)} disabled={isPlaying}
                  className="text-xs px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium disabled:opacity-40">2x</button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 font-medium block mb-1.5">Minas</label>
              <MineSelect value={mineCount} onChange={setMineCount} disabled={isPlaying} openUpward />
            </div>
          </div>
          <AnimatePresence>
            {isPlaying && revealed > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded p-3 text-center relative overflow-hidden" style={{ background: "#161616" }}>
                <div className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, #22c55e 0%, transparent 70%)" }} />
                <p className="text-xs text-white/40 font-medium mb-1">Multiplicador atual</p>
                <p className="text-2xl font-semibold" style={{ color: "#22c55e" }}>x{currentMult.toFixed(2)}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: "#22c55e" }}>R$ {(betAmount * currentMult).toFixed(2)}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col gap-2">
            {isIdle || isDead || isWon ? (
              <button onClick={isDead || isWon ? reset : startGame} disabled={betAmount > balance || betAmount <= 0}
                className="w-full py-3 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "#FF3C00" }}>
                {isDead ? "Jogar Novamente" : isWon ? "Jogar Novamente" : "Começar o jogo"}
              </button>
            ) : (
              <button onClick={() => cashOut()} disabled={revealed === 0}
                className="w-full py-3 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
                style={{ background: "#22c55e" }}>
                Retirar x{currentMult.toFixed(2)} — R$ {(betAmount * currentMult).toFixed(2)}
              </button>
            )}
            <AnimatePresence>
              {isDead && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-red-400 text-xs font-medium">Você pisou numa mina! Perdeu R$ {betAmount.toFixed(2)}</motion.p>}
              {isWon && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-green-400 text-xs font-medium">Ganhou! +R$ {(betAmount * currentMult).toFixed(2)}</motion.p>}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
