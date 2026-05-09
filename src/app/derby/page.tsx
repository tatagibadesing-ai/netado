"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBet } from "@/context/BetContext";

const ACCENT = "#FF3C00";
const GREEN = "#07E385";
const PAGE_BG = "#0d0d0d";
const PANEL_BG = "#111";
const INPUT_BG = "#161616";

type HorseId = "orange" | "cyan" | "lime" | "magenta";
type Phase = "idle" | "running" | "finished";

let derbyAudioCtx: AudioContext | null = null;

function getDerbyAudio() {
  if (typeof window === "undefined") return null;
  if (!derbyAudioCtx) {
    try {
      const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
      if (AudioCtor) derbyAudioCtx = new AudioCtor();
    } catch {
      return null;
    }
  }
  if (derbyAudioCtx?.state === "suspended") derbyAudioCtx.resume().catch(() => {});
  return derbyAudioCtx;
}

function playTone(frequency: number, type: OscillatorType, duration: number, volume: number, delay = 0) {
  const ctx = getDerbyAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playHoofbeat() {
  playTone(86 + Math.random() * 18, "triangle", 0.055, 0.08);
  playTone(118 + Math.random() * 24, "sine", 0.045, 0.055, 0.07);
}

function playWinSound() {
  playTone(520, "triangle", 0.12, 0.13);
  playTone(660, "triangle", 0.13, 0.13, 0.1);
  playTone(880, "triangle", 0.18, 0.14, 0.22);
}

function playLoseSound() {
  playTone(260, "sawtooth", 0.16, 0.09);
  playTone(190, "sawtooth", 0.2, 0.075, 0.12);
}

interface Horse {
  id: HorseId;
  name: string;
  colorLabel: string;
  color: string;
  row: number;
  laneBg: string;
  bottomOffset: number;
  odds: number;
  chance: number;
}

const HORSES: Horse[] = [
  { id: "orange", name: "Furia Solar", colorLabel: "Laranja", color: "#FF3C00", row: 0, laneBg: "/derby-lane-orange.webp", bottomOffset: 4, odds: 2.4, chance: 38 },
  { id: "cyan", name: "Raio Ciano", colorLabel: "Ciano", color: "#26C6DA", row: 1, laneBg: "/derby-lane-cyan.webp", bottomOffset: -2, odds: 3.2, chance: 28 },
  { id: "lime", name: "Lima Turbo", colorLabel: "Lima", color: "#A7D129", row: 2, laneBg: "/derby-lane-lime.webp", bottomOffset: -9, odds: 4.2, chance: 21 },
  { id: "magenta", name: "Magenta Lux", colorLabel: "Magenta", color: "#D83A8C", row: 3, laneBg: "/derby-lane-magenta.webp", bottomOffset: -15, odds: 6.8, chance: 13 },
];

const START_POSITIONS: Record<HorseId, number> = {
  orange: 4,
  cyan: 4,
  lime: 4,
  magenta: 4,
};

type PositionKeyframe = { at: number; pos: number };
type RacePath = Record<HorseId, PositionKeyframe[]>;
type HorseFrameMap = Record<HorseId, number>;

const STILL_FRAMES: HorseFrameMap = {
  orange: 0,
  cyan: 0,
  lime: 0,
  magenta: 0,
};

const STRIDE_SEQUENCE = [0, 1, 2, 1, 3, 1];

interface RaceResult {
  selected: HorseId;
  winner: HorseId;
  won: boolean;
  wager: number;
  payout: number;
}

interface HistoryEntry {
  winner: HorseId;
  odds: number;
}

function horseById(id: HorseId) {
  return HORSES.find((horse) => horse.id === id)!;
}

function pickWinner(selectedHorse: HorseId, targetRtp: number): HorseId {
  const selected = horseById(selectedHorse);
  const selectedWinChance = Math.min(0.92, targetRtp / selected.odds);
  const roll = Math.random();

  if (roll < selectedWinChance) return selectedHorse;

  const rivals = HORSES.filter((horse) => horse.id !== selectedHorse);
  const totalRivalWeight = rivals.reduce((sum, horse) => sum + horse.chance, 0);
  let rivalRoll = Math.random() * totalRivalWeight;

  for (const horse of rivals) {
    rivalRoll -= horse.chance;
    if (rivalRoll <= 0) return horse.id;
  }

  return rivals[0].id;
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildRacePath(winner: HorseId): RacePath {
  const rivals = shuffled(HORSES.filter((horse) => horse.id !== winner).map((horse) => horse.id));
  const earlyLeader = Math.random() < 0.65 ? rivals[0] : winner;
  const midLeader = earlyLeader === winner ? rivals[0] : winner;
  const loserFinals = shuffled([82 + Math.random() * 2.5, 74 + Math.random() * 4, 65 + Math.random() * 5]);
  const finals = new Map<HorseId, number>([[winner, 89 + Math.random() * 2]]);
  rivals.forEach((id, index) => finals.set(id, loserFinals[index]));

  return HORSES.reduce((paths, horse) => {
    const id = horse.id;
    const start = START_POSITIONS[id];
    const early = id === earlyLeader ? 34 + Math.random() * 4 : 21 + Math.random() * 8;
    const middle = id === midLeader ? 55 + Math.random() * 5 : id === earlyLeader ? 45 + Math.random() * 4 : 38 + Math.random() * 8;
    const late = id === winner ? 76 + Math.random() * 4 : Math.min((finals.get(id) ?? 70) - 5, 63 + Math.random() * 9);
    const finish = finals.get(id) ?? 70;

    paths[id] = [
      { at: 0, pos: start },
      { at: 0.28, pos: early },
      { at: 0.56, pos: middle },
      { at: 0.82, pos: late },
      { at: 1, pos: finish },
    ];
    return paths;
  }, {} as RacePath);
}

function interpolateRacePath(path: PositionKeyframe[], progress: number) {
  const current = path.findLast((point) => point.at <= progress) ?? path[0];
  const next = path.find((point) => point.at > progress) ?? current;
  if (current === next) return current.pos;
  const local = (progress - current.at) / (next.at - current.at);
  const eased = local + Math.sin(local * Math.PI * 2) * 0.035;
  return current.pos + (next.pos - current.pos) * eased;
}

function strideDistanceForSpeed(speed: number) {
  if (speed > 30) return 2.12;
  if (speed > 22) return 2.18;
  if (speed > 14) return 2.24;
  if (speed > 7) return 2.3;
  return 2.36;
}

function createHorseRecord(value: number): Record<HorseId, number> {
  return {
    orange: value,
    cyan: value,
    lime: value,
    magenta: value,
  };
}

function HorseSprite({ horse, frame }: { horse: Horse; frame: number }) {
  return (
    <div className="relative h-[74px] w-[92px] overflow-hidden md:h-[96px] md:w-[118px]">
      <img
        src="/derby-horse-sprites.webp"
        alt=""
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] max-w-none select-none"
        style={{
          imageRendering: "pixelated",
          transform: `translate(${-frame * 25}%, ${-horse.row * 25}%)`,
        }}
      />
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

export default function DerbyPage() {
  const router = useRouter();
  const { balance, userId, login, username } = useBet();
  const [selectedHorse, setSelectedHorse] = useState<HorseId>("orange");
  const [betAmount, setBetAmount] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [horseFrames, setHorseFrames] = useState<HorseFrameMap>(STILL_FRAMES);
  const [positions, setPositions] = useState<Record<HorseId, number>>(START_POSITIONS);
  const [racePath, setRacePath] = useState<RacePath | null>(null);
  const [winner, setWinner] = useState<HorseId | null>(null);
  const [lastResult, setLastResult] = useState<RaceResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { winner: "cyan", odds: 3.2 },
    { winner: "orange", odds: 2.4 },
    { winner: "magenta", odds: 6.8 },
    { winner: "lime", odds: 4.2 },
  ]);

  const balanceRef = useRef(balance);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoofTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const betCountRef = useRef(0);
  const frameStepRef = useRef<Record<HorseId, number>>(createHorseRecord(0));
  const strideDistanceRef = useRef<Record<HorseId, number>>(createHorseRecord(0));
  const previousPositionsRef = useRef<Record<HorseId, number>>(START_POSITIONS);
  const previousTimeRef = useRef(0);
  const runningDuration = 6.2;

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`derby_bet_count_${userId}`);
    betCountRef.current = stored ? parseInt(stored, 10) : 0;
  }, [userId]);

  useEffect(() => {
    if (phase !== "running" || !racePath) return;

    const startedAt = performance.now();
    previousTimeRef.current = startedAt;
    previousPositionsRef.current = START_POSITIONS;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (runningDuration * 1000));
      const dt = Math.max((now - previousTimeRef.current) / 1000, 1 / 120);
      const nextPositions = HORSES.reduce((next, horse) => {
        next[horse.id] = interpolateRacePath(racePath[horse.id], progress);
        return next;
      }, {} as Record<HorseId, number>);
      const nextFrames = { ...STILL_FRAMES };

      HORSES.forEach((horse) => {
        const movement = Math.max(0, nextPositions[horse.id] - previousPositionsRef.current[horse.id]);
        const speed = movement / dt;
        const minimumStride = dt * 2.75;
        strideDistanceRef.current[horse.id] += Math.max(movement, minimumStride);

        const strideDistance = strideDistanceForSpeed(speed);
        while (strideDistanceRef.current[horse.id] >= strideDistance) {
          strideDistanceRef.current[horse.id] -= strideDistance;
          frameStepRef.current[horse.id] += 1;
        }

        nextFrames[horse.id] = STRIDE_SEQUENCE[frameStepRef.current[horse.id] % STRIDE_SEQUENCE.length];
      });

      previousTimeRef.current = now;
      previousPositionsRef.current = nextPositions;
      setPositions(nextPositions);
      setHorseFrames(nextFrames);

      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, racePath, runningDuration]);

  useEffect(() => {
    if (hoofTimerRef.current) {
      clearInterval(hoofTimerRef.current);
      hoofTimerRef.current = null;
    }

    if (phase !== "running") return;

    playHoofbeat();
    hoofTimerRef.current = setInterval(playHoofbeat, 175);

    return () => {
      if (hoofTimerRef.current) {
        clearInterval(hoofTimerRef.current);
        hoofTimerRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (hoofTimerRef.current) clearInterval(hoofTimerRef.current);
    };
  }, []);

  const selected = horseById(selectedHorse);
  const isRunning = phase === "running";

  const applyDelta = async (delta: number): Promise<number | null> => {
    if (!userId || !username) return null;
    const { adjustBalance } = await import("@/lib/supabase");
    const nb = await adjustBalance(userId, delta);
    if (nb !== null) {
      balanceRef.current = nb;
      login(userId, username, nb);
    }
    return nb;
  };

  const startRace = async () => {
    if (!userId || !username || isRunning || betAmount <= 0 || betAmount > balanceRef.current) return;
    getDerbyAudio();

    const wager = betAmount;
    const picked = selectedHorse;
    const pickedHorse = horseById(picked);

    const debited = await applyDelta(-wager);
    if (debited === null) return; // server rejected (parallel tab spent it)

    const isWelcomeBet = betCountRef.current < 7;
    const targetRtp = isWelcomeBet ? 1.4 : 1.1;
    const raceWinner = pickWinner(picked, targetRtp);
    const nextRacePath = buildRacePath(raceWinner);

    betCountRef.current += 1;
    localStorage.setItem(`derby_bet_count_${userId}`, String(betCountRef.current));

    setPhase("running");
    setWinner(null);
    setLastResult(null);
    setPositions(START_POSITIONS);
    setHorseFrames(STILL_FRAMES);
    frameStepRef.current = createHorseRecord(0);
    strideDistanceRef.current = createHorseRecord(0);
    previousPositionsRef.current = START_POSITIONS;
    setRacePath(nextRacePath);

    finishTimerRef.current = setTimeout(async () => {
      const won = raceWinner === picked;
      const payout = won ? wager * pickedHorse.odds : 0;

      setPhase("finished");
      setWinner(raceWinner);
      setRacePath(null);
      setHorseFrames(STILL_FRAMES);
      setLastResult({ selected: picked, winner: raceWinner, won, wager, payout });
      setHistory((current) => [{ winner: raceWinner, odds: horseById(raceWinner).odds }, ...current].slice(0, 10));
      if (won) playWinSound();
      else playLoseSound();

      if (won) await applyDelta(payout);
    }, runningDuration * 1000);
  };

  const resetRace = () => {
    if (isRunning) return;
    setPhase("idle");
    setWinner(null);
    setLastResult(null);
    setRacePath(null);
    setPositions(START_POSITIONS);
    setHorseFrames(STILL_FRAMES);
  };

  const BetControls = (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/40">Quantia</label>
        <div className="flex items-center gap-2 rounded-[3px] px-3 py-2.5" style={{ background: PAGE_BG }}>
          <span className="text-xs font-medium text-white/40">R$</span>
          <input
            type="number"
            value={betAmount}
            onChange={(event) => setBetAmount(Math.max(1, Number(event.target.value)))}
            disabled={isRunning}
            className="w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none disabled:opacity-50"
          />
          <button
            onClick={() => setBetAmount((value) => Math.max(1, Math.floor(value / 2)))}
            disabled={isRunning}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
          >
            1/2
          </button>
          <button
            onClick={() => setBetAmount((value) => value * 2)}
            disabled={isRunning}
            className="rounded-[3px] bg-white/5 px-2 py-1 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40"
          >
            2x
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/40">Selecionar Cavalo</label>
        <div className="grid grid-cols-4 gap-2">
          {HORSES.map((horse) => {
            const isSelected = selectedHorse === horse.id;
            return (
              <button
                key={horse.id}
                onClick={() => setSelectedHorse(horse.id)}
                disabled={isRunning}
                className="flex flex-col items-center justify-center rounded py-2 text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "#121212",
                  color: horse.color,
                  outline: isSelected ? `1px solid ${horse.color}` : "1px solid transparent",
                  outlineOffset: "1px",
                }}
              >
                <span className="text-sm font-semibold leading-none">x{horse.odds.toFixed(1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden rounded-[4px] p-3 md:block" style={{ background: INPUT_BG }}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-white/40">Escolhido</span>
          <span className="text-xs font-semibold text-white">{selected.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-white/40">Retorno possivel</span>
          <span className="text-sm font-bold" style={{ color: selected.color }}>
            R$ {(betAmount * selected.odds).toFixed(2)}
          </span>
        </div>
      </div>

      <motion.button
        onClick={phase === "finished" ? resetRace : startRace}
        disabled={isRunning || betAmount > balance || betAmount <= 0}
        whileTap={{ scale: 0.97 }}
        className="flex w-full items-center justify-center rounded-[3px] py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
        style={{ background: ACCENT }}
      >
        {isRunning ? "Correndo..." : phase === "finished" ? "Nova Corrida" : "Apostar e Correr"}
      </motion.button>

      <div className="min-h-5">
        <AnimatePresence mode="wait">
          {lastResult && (
            <motion.p
              key={`${lastResult.winner}-${lastResult.wager}-${lastResult.won}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs font-medium"
              style={{ color: lastResult.won ? GREEN : ACCENT }}
            >
              {lastResult.won
                ? `Ganhou R$ ${lastResult.payout.toFixed(2)} no ${horseById(lastResult.winner).colorLabel}`
                : `${horseById(lastResult.winner).colorLabel} venceu. Perdeu R$ ${lastResult.wager.toFixed(2)}`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
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
          <span className="text-sm font-semibold text-white">DerbyNetano</span>
        </div>
        <span className="text-xs font-medium text-white/40">Netano Originals</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="hidden w-[270px] shrink-0 flex-col gap-4 p-4 md:flex" style={{ background: PANEL_BG }}>
          {BetControls}
          <div className="mt-auto flex justify-between pt-3 text-xs font-medium text-white/30">
            <span>Saldo</span>
            <span className="text-white/50">R$ {balance.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex min-h-[430px] flex-1 flex-col bg-[#0d0d0d] md:min-h-0">
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 md:px-6" style={{ background: PANEL_BG }}>
            {history.map((entry, index) => {
              const horse = horseById(entry.winner);
              return (
                <div
                  key={`${entry.winner}-${index}`}
                  className="flex shrink-0 items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-xs font-bold text-white"
                  style={{ background: `${horse.color}1f` }}
                >
                  <ColorDot color={horse.color} />
                  <span>{horse.colorLabel}</span>
                  <span className="text-white/45">{entry.odds.toFixed(1)}x</span>
                </div>
              );
            })}
          </div>

          <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-3 py-5 md:px-8 md:py-8">
            <div className="relative mx-auto flex w-full max-w-[980px] flex-col gap-2">
              <div className="relative overflow-hidden rounded-[4px] bg-[#15110f] p-2 md:p-3">
                {HORSES.map((horse) => {
                  const isWinner = winner === horse.id;
                  return (
                    <div
                      key={horse.id}
                      className="relative mb-2 h-[84px] overflow-hidden rounded-[3px] last:mb-0 md:h-[104px]"
                      style={{
                        backgroundImage: `url('${horse.laneBg}')`,
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                      }}
                    >
                      <div
                        className="absolute bottom-1 top-1 z-10 w-[2px] opacity-55"
                        style={{
                          right: "9%",
                          background:
                            "repeating-linear-gradient(180deg, rgba(255,255,255,0.84) 0 5px, rgba(18,18,18,0.58) 5px 10px)",
                        }}
                      />
                      <div className="absolute left-3 top-2 z-10 flex items-center gap-2 rounded-[3px] bg-black/25 px-2 py-1 text-xs font-bold text-white">
                        <ColorDot color={horse.color} />
                        <span className="hidden sm:inline">{horse.name}</span>
                        <span className="sm:hidden">{horse.colorLabel}</span>
                      </div>
                      {isWinner && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute right-4 top-2 z-20 rounded-[3px] px-2 py-1 text-xs font-black text-[#101010]"
                          style={{ background: GREEN }}
                        >
                          Venceu
                        </motion.div>
                      )}
                      <motion.div
                        className="absolute z-20"
                        animate={{ left: `${positions[horse.id]}%` }}
                        transition={{ duration: isRunning ? 0.08 : 0.35, ease: "linear" }}
                        style={{ bottom: horse.bottomOffset }}
                      >
                        <HorseSprite horse={horse} frame={isRunning ? horseFrames[horse.id] : 0} />
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 md:hidden" style={{ background: PANEL_BG }}>
          {BetControls}
        </div>
      </div>
    </div>
  );
}
