"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft } from "lucide-react";

const ACCENT   = "#FF3C00";
const PAGE_BG  = "#0d0d0d";
const PANEL_BG = "#111";
const GREEN    = "#26890C";
const ANSWER_COLORS = ["#E21B3C", "#1368CE", "#D89E00", "#26890C"];

let audioCtx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch { /* ignore */ }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playTone(freqs: number[], duration = 0.12, type: OscillatorType = "sine") {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const start = now + i * duration * 0.72;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}

function playCorrect() { playTone([660, 880, 1175], 0.11, "triangle"); }
function playWrong() { playTone([260, 190], 0.16, "sawtooth"); }
function playTimerWarning() { playTone([760, 760, 760], 0.08, "square"); }

/* ── Perguntas ────────────────────────────────────────── */

interface Question {
  id: number;
  theme: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  multiplier: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    theme: "Fome e Crise Agrícola",
    question: "A Grande Fome de 1315 foi tão desesperadora que relatos históricos de Bristol documentam algo absolutamente perturbador. O que era esse absurdo?",
    options: [
      "Pessoas vendendo crianças como escravas para comer",
      "Pais comendo os próprios filhos por desespero",
      "Nobres bebendo sangue de animais no café da manhã",
      "Padeiros sendo executados por vender pão estragado",
    ],
    correct: 1,
    explanation: "Os registros de Bristol de 1315 documentam literalmente canibalismo — pais comendo seus próprios filhos. A Grande Fome (1315–1322) matou entre 10% e 25% da população de diversas cidades europeias.",
    multiplier: 2.0,
  },
  {
    id: 2,
    theme: "Peste Negra",
    question: "A Peste Negra chegou à Europa em outubro de 1347. Em quanto tempo ela devastou ~50% da população europeia (25-30 milhões de pessoas)?",
    options: [
      "6 meses",
      "1 ano",
      "5 anos (1347–1352)",
      "20 anos",
    ],
    correct: 2,
    explanation: "Entre 1347 e 1352 — apenas 5 anos — a Peste Negra eliminou metade da Europa. Florença perdeu 80% da sua população em apenas 4 meses de 1348. Paris perdeu 50.000 dos seus 100.000 habitantes.",
    multiplier: 1.8,
  },
  {
    id: 3,
    theme: "Guerras",
    question: "Na Batalha de Crécy (1346), os arqueiros ingleses dispararam uma quantidade absurda de flechas. Qual foi o número aproximado registrado nas crônicas?",
    options: [
      "50.000 flechas",
      "150.000 flechas",
      "500.000 flechas",
      "2 flechas e uma oração",
    ],
    correct: 2,
    explanation: "As crônicas medievais registram mais de 500.000 flechas disparadas em Crécy. Os arqueiros ingleses com longbows galeses disparavam até 12 flechas por minuto a 300 metros. Os franceses perderam ~6.000 homens, os ingleses apenas ~300.",
    multiplier: 2.2,
  },
  {
    id: 4,
    theme: "Crise do Feudalismo",
    question: "Após a Peste Negra matar 1/3 da população, algo inédito aconteceu com os salários dos trabalhadores rurais. O que foi?",
    options: [
      "Caíram pela metade — menos boca para se defender",
      "Ficaram iguais — nobres não ligavam pra isso",
      "Dobraram — faltava gente para trabalhar",
      "Foram extintos — voltou o escambo de batatas",
    ],
    correct: 2,
    explanation: "Com 1/3 da população morta, de repente havia menos trabalhadores do que propriedades precisavam. Os salários dobraram em muitas regiões. Pela primeira vez, camponeses tinham poder de negociação — o que enfureceu tanto a nobreza que criaram leis para limitar salários.",
    multiplier: 1.7,
  },
  {
    id: 5,
    theme: "Revoltas Sociais",
    question: "A Jacquerie (1358) começou quando camponeses foram obrigados a fazer algo completamente absurdo. Qual foi o motivo imediato da revolta?",
    options: [
      "Pagar imposto em forma de galinhas vivas",
      "Defender os castelos dos próprios nobres que os oprimiam",
      "Construir igrejas sem receber pagamento",
      "Ceder as filhas para servir nos banquetes feudais",
    ],
    correct: 1,
    explanation: "Os camponeses foram obrigados a defender militarmente os castelos feudais — os mesmos que simbolizavam sua opressão. Já revoltados pela derrota dos nobres em Poitiers (1356), isso foi a gota d'água. A Jacquerie destruiu mais de 100 castelos em 2 meses.",
    multiplier: 2.0,
  },
  {
    id: 6,
    theme: "Peste Negra",
    question: "A Islândia perdeu 50–66% da sua população para a Peste Negra. O que torna esse fato especialmente bizarro?",
    options: [
      "A Islândia não tinha médicos, só bardos",
      "Não havia ratos na Islândia nessa época — a doença chegou mesmo assim",
      "Os islandeses já estavam todos doentes de outra coisa",
      "A Islândia era tão fria que a bactéria deveria morrer",
    ],
    correct: 1,
    explanation: "A teoria clássica culpa ratos como vetores. Mas a Islândia não tinha ratos nessa época — e mesmo assim perdeu mais da metade da população. Estudos recentes sugerem que piolhos e parasitas humanos foram vetores igualmente importantes.",
    multiplier: 2.5,
  },
  {
    id: 7,
    theme: "Guerras",
    question: "A 'Guerra dos Cem Anos' durou exatamente 100 anos?",
    options: [
      "Sim, exatamente 100 anos de batalhas contínuas",
      "Não — durou 116 anos (1337–1453) com 3 fases separadas",
      "Não — durou 87 anos mas ninguém contou direito",
      "Sim, e foi chamada assim pelos próprios guerreiros medievais",
    ],
    correct: 1,
    explanation: "A Guerra dos Cem Anos durou 116 anos (1337–1453) e não foi contínua — teve 3 fases separadas por tratados de paz. O nome foi dado por historiadores do século XIX, muito depois do fim da guerra. Os próprios medievais não a chamavam assim.",
    multiplier: 1.5,
  },
  {
    id: 8,
    theme: "Revoltas Sociais",
    question: "Em 1381, Wat Tyler negociou com o Rei Ricardo II, que tinha apenas 14 anos, e conseguiu acordos históricos. O que aconteceu logo em seguida?",
    options: [
      "Ricardo II cumpriu tudo e aboliu o feudalismo",
      "Tyler foi morto durante as negociações e o rei revogou tudo",
      "Tyler se tornou conselheiro real por mérito",
      "Ricardo II fugiu para a França envergonhado",
    ],
    correct: 1,
    explanation: "Durante as negociações em Smithfield, Wat Tyler foi assassinado por oficiais leais ao rei. Com isso, Ricardo II — que havia prometido abolir a servidão — revogou todos os acordos. Muitos rebeldes foram caçados e executados. A servidão durou mais 2 séculos.",
    multiplier: 2.0,
  },
];

/* ── Ranking (top scores armazenados localmente) ────── */

interface ScoreEntry { username: string; score: number; correct: number; date: string; }

function getScores(): ScoreEntry[] {
  try { return JSON.parse(localStorage.getItem("quiz_scores") || "[]"); } catch { return []; }
}
function saveScore(entry: ScoreEntry) {
  const scores = [entry, ...getScores()].sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem("quiz_scores", JSON.stringify(scores));
}

function AnswerSymbol({ index }: { index: number }) {
  if (index === 0) {
    return <span className="h-0 w-0 border-x-[18px] border-b-[31px] border-x-transparent border-b-white md:border-x-[24px] md:border-b-[42px]" />;
  }
  if (index === 1) {
    return <span className="h-9 w-9 rotate-45 bg-white md:h-12 md:w-12" />;
  }
  if (index === 2) {
    return <span className="h-10 w-10 rounded-full bg-white md:h-[52px] md:w-[52px]" />;
  }
  return <span className="h-10 w-10 bg-white md:h-[52px] md:w-[52px]" />;
}

/* ── Timer Bar ────────────────────────────────────────── */
function TimerBar({
  duration,
  onEnd,
  onWarning,
  running,
}: {
  duration: number;
  onEnd: () => void;
  onWarning: () => void;
  running: boolean;
}) {
  const onEndRef = useRef(onEnd);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onEndRef.current = onEnd;
    onWarningRef.current = onWarning;
  }, [onEnd, onWarning]);

  useEffect(() => {
    if (!running) return;
    const warning = setTimeout(() => onWarningRef.current(), Math.max(0, duration - 5) * 1000);
    const timeout = setTimeout(() => onEndRef.current(), duration * 1000);
    return () => {
      clearTimeout(warning);
      clearTimeout(timeout);
    };
  }, [running, duration]);

  return (
    <div className="w-full h-3 rounded-[2px] bg-white/10 overflow-hidden md:h-4">
      <motion.div
        key={running ? "running" : "idle"}
        className="h-full rounded-[1px]"
        initial={{ width: "100%" }}
        animate={{ width: running ? "0%" : "100%", backgroundColor: running ? ["#ffffff", "#ffffff", ACCENT] : "#ffffff" }}
        transition={running ? { duration, ease: "linear", times: [0, 0.75, 1] } : { duration: 0 }}
      />
    </div>
  );
}

/* ── Quiz Page ────────────────────────────────────────── */
type Phase = "lobby" | "playing" | "result" | "ranking";

export default function QuizPage() {
  const router = useRouter();
  const { balance, userId, username, login } = useBet();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [betAmount, setBetAmount] = useState(10);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [totalLost, setTotalLost] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [moneyFlash, setMoneyFlash] = useState<{ id: number; amount: number; won: boolean } | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() =>
    typeof window === "undefined" ? [] : getScores()
  );
  const flashIdRef = useRef(0);

  const q = QUESTIONS[current];
  const TIMER = 20;

  function startGame() {
    if (betAmount <= 0 || betAmount > balance) return;
    getAudio();
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setTotalWon(0);
    setTotalLost(0);
    setTimeUp(false);
    setMoneyFlash(null);
    setTimerRunning(true);
    setPhase("playing");
  }

  async function handleAnswer(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setTimerRunning(false);

    const isCorrect = idx === q.correct;
    let delta = 0;

    if (isCorrect) {
      delta = betAmount * q.multiplier;
      setCorrectCount(c => c + 1);
      setTotalWon(w => w + delta);
      playCorrect();
    } else {
      delta = -betAmount;
      setTotalLost(l => l + betAmount);
      playWrong();
    }
    flashIdRef.current += 1;
    setMoneyFlash({ id: flashIdRef.current, amount: Math.abs(delta), won: isCorrect });

    if (userId && username) {
      const { adjustBalance } = await import("@/lib/supabase");
      const nb = await adjustBalance(userId, delta);
      if (nb !== null) login(userId, username, nb);
    }
  }

  function handleTimeUp() {
    if (answered) return;
    setTimeUp(true);
    setAnswered(true);
    setTimerRunning(false);
    setTotalLost(l => l + betAmount);
    flashIdRef.current += 1;
    setMoneyFlash({ id: flashIdRef.current, amount: betAmount, won: false });
    playWrong();
    if (userId && username) {
      import("@/lib/supabase").then(async ({ adjustBalance }) => {
        const nb = await adjustBalance(userId, -betAmount);
        if (nb !== null) login(userId, username, nb);
      });
    }
  }

  function handleTimerWarning() {
    if (!answered) playTimerWarning();
  }

  function nextQuestion() {
    if (current + 1 >= QUESTIONS.length) {
      const entry: ScoreEntry = {
        username: username || "Anônimo",
        score: Math.round(totalWon - totalLost),
        correct: correctCount,
        date: new Date().toLocaleDateString("pt-BR"),
      };
      saveScore(entry);
      setScores(getScores());
      setPhase("result");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
      setTimeUp(false);
      setMoneyFlash(null);
      setTimerRunning(true);
    }
  }

  const finalCorrect = correctCount;
  const canStart = betAmount > 0 && betAmount <= balance;
  const totalPotential = betAmount * QUESTIONS.reduce((sum, item) => sum + item.multiplier, 0);

  const renderBetControls = (className = "") => (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div>
        <label className="text-xs text-white/40 font-medium block mb-1.5">Quantia</label>
        <div className="flex items-center gap-2 bg-[#0d0d0d] rounded px-3 py-2.5">
          <span className="text-white/40 text-xs font-medium">R$</span>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
            className="flex-1 bg-transparent text-white text-sm font-semibold outline-none w-0"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))}
              className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors"
            >
              1/2
            </button>
            <button
              onClick={() => setBetAmount(v => v * 2)}
              className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium transition-colors"
            >
              2x
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-[#0d0d0d] px-3 py-2.5">
          <p className="text-white/35 font-medium">Perguntas</p>
          <p className="text-white font-semibold mt-1">{QUESTIONS.length}</p>
        </div>
        <div className="rounded bg-[#0d0d0d] px-3 py-2.5">
          <p className="text-white/35 font-medium">Tempo</p>
          <p className="text-white font-semibold mt-1">{TIMER}s</p>
        </div>
      </div>
      <div className="rounded bg-[#0d0d0d] px-3 py-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-white/35">Retorno máximo</span>
          <span className="text-white">R$ {totalPotential.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={startGame}
        disabled={!canStart}
        className="w-full py-3.5 rounded text-white text-sm font-semibold transition-all disabled:opacity-40 active:scale-95"
        style={{ background: ACCENT }}
      >
        Começar o jogo
      </button>
      <button
        onClick={() => setPhase("ranking")}
        className="w-full py-3 rounded bg-[#0d0d0d] text-white/50 hover:text-white text-sm font-semibold transition-colors"
      >
        Ranking
      </button>
      <div className="flex justify-between text-xs text-white/30 font-medium pt-1">
        <span>Saldo</span>
        <span className="text-white/50">R$ {balance.toFixed(2)}</span>
      </div>
    </div>
  );

  /* ── Lobby ── */
  if (phase === "lobby") return (
    <div className="flex-1 flex flex-col bg-[#0d0d0d] min-h-0">
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm font-semibold">Quiz</span>
        </div>
        <span className="text-white/40 text-xs font-medium">Netano Originals</span>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex w-[300px] shrink-0 bg-[#111] flex-col p-5">
          {renderBetControls()}
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-5xl text-center"
          >
            <p className="text-white/45 text-sm font-semibold mb-3">Netano Originals</p>
            <h1 className="text-white text-4xl md:text-7xl font-black leading-none mb-4">
              Quiz
            </h1>
            <p className="text-white/55 text-base md:text-2xl font-medium">
              Responda rápido, escolha uma cor e avance pergunta por pergunta.
            </p>
          </motion.div>
        </div>

        <div className="md:hidden bg-[#111] flex flex-col gap-3 p-4">
          {renderBetControls()}
        </div>
      </div>
    </div>
  );

  /* ── Ranking ── */
  if (phase === "ranking") return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <button onClick={() => setPhase("lobby")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-white font-semibold text-sm">Ranking do Quiz</span>
        <span />
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">Top 10 — Maiores ganhos</p>
        {scores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 rounded bg-[#111]">
            <p className="text-white/10 text-4xl font-black">0</p>
            <p className="text-white/30 text-sm">Nenhuma partida ainda</p>
          </div>
        )}
        {scores.map((s, i) => {
          return (
            <div key={i} className="flex items-center gap-3 rounded px-4 py-3"
              style={{ background: s.username === username ? "#161616" : PANEL_BG }}>
              <span className="w-7 text-center text-sm font-bold" style={{ color: i < 3 ? "white" : "rgba(255,255,255,0.3)" }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{s.username}</p>
                <p className="text-white/30 text-xs">{s.correct}/8 corretas · {s.date}</p>
              </div>
              <p className="text-sm font-bold" style={{ color: s.score >= 0 ? "#10B981" : ACCENT }}>
                {s.score >= 0 ? "+" : ""}R$ {s.score}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── Result ── */
  if (phase === "result") {
    const net = totalWon - totalLost;
    const perfect = finalCorrect === 8;
    return (
      <div className="flex-1 flex flex-col min-h-0" style={{ background: PAGE_BG }}>
        <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/40 text-xs font-medium">Quiz Medieval</span>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
            className="w-full max-w-md flex flex-col gap-5 items-center text-center">
            <div
              className="w-24 h-24 rounded flex items-center justify-center text-4xl font-black text-white"
              style={{ background: perfect || finalCorrect >= 6 ? GREEN : finalCorrect >= 4 ? "#D89E00" : "#E21B3C" }}
            >
              {finalCorrect}
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold mb-1">
                {perfect ? "Perfeito!" : finalCorrect >= 6 ? "Muito bem!" : finalCorrect >= 4 ? "Quase lá" : "Tenta de novo"}
              </h2>
              <p className="text-white/40 text-sm">{finalCorrect} de 8 respostas corretas</p>
            </div>

            <div className="w-full rounded-2xl p-5 flex flex-col gap-3" style={{ background: PANEL_BG }}>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Ganhos</span>
                <span className="text-green-400 font-bold">+R$ {totalWon.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">Perdas</span>
                <span className="text-red-400 font-bold">-R$ {totalLost.toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between">
                <span className="text-white font-bold text-sm">Resultado</span>
                <span className="font-black text-lg" style={{ color: net >= 0 ? "#10B981" : ACCENT }}>
                  {net >= 0 ? "+" : ""}R$ {net.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={() => setPhase("ranking")}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/70"
                style={{ background: PANEL_BG }}>
                Ranking
              </button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPhase("lobby")}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: ACCENT }}>
                Jogar Novamente
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Playing ── */
  const isCorrect = selected === q.correct;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: PAGE_BG }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/cassino")}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Cassino
          </button>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm font-semibold">Quiz</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">R$ {betAmount.toFixed(2)}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="relative flex-1 overflow-y-auto flex flex-col items-center px-4 py-5 gap-4 max-w-[1150px] mx-auto w-full md:py-8 md:gap-6"
      >
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-white/35 text-[11px] font-semibold uppercase tracking-wide md:text-sm">{q.theme}</p>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white/35 md:text-sm">
            <span>{current + 1}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{QUESTIONS.length}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="w-full">
          <TimerBar duration={TIMER} onEnd={handleTimeUp} onWarning={handleTimerWarning} running={timerRunning && !answered} />
        </div>

        <p className="text-white/45 text-xs font-semibold md:text-base">
          Acertou: +R$ {(betAmount * q.multiplier).toFixed(2)} ({q.multiplier}x)
        </p>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id + "-q"}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
            className="w-full rounded p-5 md:p-10 text-center"
            style={{ background: PANEL_BG }}>
            <p className="text-white font-bold text-lg md:text-[32px] md:leading-tight leading-snug">{q.question}</p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {moneyFlash && (
            <motion.div
              key={moneyFlash.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="pointer-events-none absolute left-1/2 top-[188px] z-30 -translate-x-1/2 rounded px-6 py-3 text-lg font-black text-white md:top-[246px] md:px-9 md:py-4 md:text-3xl"
              style={{ background: moneyFlash.won ? GREEN : "#E21B3C" }}
            >
              {moneyFlash.won ? "+" : "-"}R$ {moneyFlash.amount.toFixed(2)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {q.options.map((opt, i) => {
            const showCorrect = answered && i === q.correct;
            const showWrong = answered && selected === i && i !== q.correct;

            let bg = ANSWER_COLORS[i];
            const opacity = answered && !showCorrect && !showWrong ? 0.35 : 1;

            if (showCorrect) bg = GREEN;
            else if (showWrong) bg = "#E21B3C";

            return (
              <motion.button key={i}
                whileTap={!answered ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className="w-full min-h-[96px] text-left rounded px-5 py-4 text-white transition-all flex items-center gap-5 active:scale-[0.99] md:min-h-[125px] md:px-7 md:py-6 md:gap-8"
                style={{ background: bg, opacity }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center md:h-16 md:w-16">
                  <AnswerSymbol index={i} />
                </span>
                <span className="leading-snug text-sm md:text-[21px] md:leading-tight font-bold">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {answered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
              className="w-full rounded p-4 md:p-5"
              style={{
                background: timeUp ? "#161616" : isCorrect ? "rgba(7,227,133,0.13)" : "rgba(226,27,60,0.13)",
              }}>
              <p className="font-bold text-sm mb-1 md:text-lg"
                style={{ color: timeUp ? "#9CA3AF" : isCorrect ? GREEN : "#E21B3C" }}>
                {timeUp ? "Tempo esgotado! -R$ " + betAmount.toFixed(2)
                  : isCorrect ? `Correto! +R$ ${(betAmount * q.multiplier).toFixed(2)}`
                  : `Errado! -R$ ${betAmount.toFixed(2)}`}
              </p>
              <p className="text-white/50 text-xs leading-relaxed md:text-sm">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next button */}
        <AnimatePresence>
          {answered && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}
              whileTap={{ scale: 0.97 }} onClick={nextQuestion}
              className="w-full py-3.5 rounded text-white font-bold text-sm md:py-5 md:text-lg"
              style={{ background: current + 1 >= QUESTIONS.length ? GREEN : ACCENT }}>
              {current + 1 >= QUESTIONS.length ? "Ver resultado" : "Próxima pergunta"}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
