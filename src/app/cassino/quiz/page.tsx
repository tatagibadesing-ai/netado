"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, Trophy, Clock, Zap, Skull, Sword, Wheat, FlameKindling, Users } from "lucide-react";

const ACCENT   = "#FF3C00";
const PAGE_BG  = "#0d0d0d";
const PANEL_BG = "#111";

/* ── Perguntas ────────────────────────────────────────── */

interface Question {
  id: number;
  researcher: string;
  theme: string;
  themeColor: string;
  themeBg: string;
  icon: React.ReactNode;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  multiplier: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    researcher: "Nicolas",
    theme: "Fome e Crise Agrícola",
    themeColor: "#F59E0B",
    themeBg: "rgba(245,158,11,0.08)",
    icon: <Wheat size={18} />,
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
    researcher: "Davi",
    theme: "Peste Negra",
    themeColor: "#8B5CF6",
    themeBg: "rgba(139,92,246,0.08)",
    icon: <Skull size={18} />,
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
    researcher: "João Francisco",
    theme: "Guerras",
    themeColor: "#EF4444",
    themeBg: "rgba(239,68,68,0.08)",
    icon: <Sword size={18} />,
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
    researcher: "Nathan",
    theme: "Crise do Feudalismo",
    themeColor: "#10B981",
    themeBg: "rgba(16,185,129,0.08)",
    icon: <FlameKindling size={18} />,
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
    researcher: "Bruno",
    theme: "Revoltas Sociais",
    themeColor: "#F97316",
    themeBg: "rgba(249,115,22,0.08)",
    icon: <Users size={18} />,
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
    researcher: "Davi",
    theme: "Peste Negra",
    themeColor: "#8B5CF6",
    themeBg: "rgba(139,92,246,0.08)",
    icon: <Skull size={18} />,
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
    researcher: "João Francisco",
    theme: "Guerras",
    themeColor: "#EF4444",
    themeBg: "rgba(239,68,68,0.08)",
    icon: <Sword size={18} />,
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
    researcher: "Bruno",
    theme: "Revoltas Sociais",
    themeColor: "#F97316",
    themeBg: "rgba(249,115,22,0.08)",
    icon: <Users size={18} />,
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

/* ── Timer Bar ────────────────────────────────────────── */
function TimerBar({ duration, onEnd, running }: { duration: number; onEnd: () => void; running: boolean }) {
  const [left, setLeft] = useState(duration);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    if (!running) { setLeft(duration); return; }
    started.current = Date.now();
    setLeft(duration);
    ref.current = setInterval(() => {
      const elapsed = (Date.now() - started.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setLeft(remaining);
      if (remaining <= 0) { clearInterval(ref.current!); onEnd(); }
    }, 80);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, duration]);

  const pct = (left / duration) * 100;
  const color = pct > 50 ? "#10B981" : pct > 25 ? "#F59E0B" : "#EF4444";

  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full transition-colors duration-300"
        style={{ width: `${pct}%`, background: color }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.08 }}
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
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [balanceAtStart, setBalanceAtStart] = useState(0);

  const q = QUESTIONS[current];
  const TIMER = 20;

  useEffect(() => { setScores(getScores()); }, []);

  function startGame() {
    if (betAmount <= 0 || betAmount > balance) return;
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setTotalWon(0);
    setTotalLost(0);
    setTimeUp(false);
    setTimerRunning(true);
    setBalanceAtStart(balance);
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
    } else {
      delta = -betAmount;
      setTotalLost(l => l + betAmount);
    }

    const newBal = balance + delta;
    if (userId) {
      login(userId, username!, newBal);
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("netano_profiles").update({ balance: newBal }).eq("id", userId);
    }
  }

  function handleTimeUp() {
    if (answered) return;
    setTimeUp(true);
    setAnswered(true);
    setTimerRunning(false);
    setTotalLost(l => l + betAmount);
    const newBal = balance - betAmount;
    if (userId) {
      login(userId, username!, newBal);
      import("@/lib/supabase").then(({ supabase }) =>
        supabase.from("netano_profiles").update({ balance: newBal }).eq("id", userId)
      );
    }
  }

  function nextQuestion() {
    if (current + 1 >= QUESTIONS.length) {
      const entry: ScoreEntry = {
        username: username || "Anônimo",
        score: Math.round(totalWon - totalLost + (correctCount >= 6 ? 500 : 0)),
        correct: correctCount + (selected === q.correct ? 1 : 0),
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
      setTimerRunning(true);
    }
  }

  const finalCorrect = correctCount + (answered && selected === q.correct ? 1 : 0);

  /* ── Lobby ── */
  if (phase === "lobby") return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <button onClick={() => router.push("/cassino")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Cassino
        </button>
        <span className="text-white/40 text-xs font-medium">Netano Originals</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-8 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md flex flex-col gap-5">

          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ background: "rgba(255,60,0,0.15)", border: "1px solid rgba(255,60,0,0.3)" }}>
              🏰
            </div>
            <h1 className="text-white text-2xl font-bold mb-1">Quiz da Crise Medieval</h1>
            <p className="text-white/40 text-sm">Século XIV — Fome, Peste e Guerra</p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "📋", label: "8 perguntas", sub: "temáticas" },
              { icon: "⏱️", label: "20 seg", sub: "por pergunta" },
              { icon: "💰", label: "Até 2.5x", sub: "por acerto" },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: PANEL_BG }}>
                <div className="text-2xl mb-1">{c.icon}</div>
                <p className="text-white text-xs font-bold">{c.label}</p>
                <p className="text-white/30 text-[10px]">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Pesquisadores */}
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: PANEL_BG }}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-1">Pesquisadores</p>
            {[
              { name: "Nicolas", topic: "Fome e Crise Agrícola", color: "#F59E0B" },
              { name: "Davi", topic: "Peste Negra", color: "#8B5CF6" },
              { name: "João Francisco", topic: "Guerras", color: "#EF4444" },
              { name: "Nathan", topic: "Crise no Feudalismo", color: "#10B981" },
              { name: "Bruno", topic: "Revoltas Sociais", color: "#F97316" },
            ].map(r => (
              <div key={r.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-white text-sm font-semibold">{r.name}</span>
                <span className="text-white/30 text-xs">— {r.topic}</span>
              </div>
            ))}
          </div>

          {/* Aposta */}
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: PANEL_BG }}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">Aposta por pergunta</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: PAGE_BG }}>
              <span className="text-white/40 text-xs font-medium">R$</span>
              <input type="number" value={betAmount}
                onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                className="flex-1 bg-transparent text-white text-sm font-bold outline-none w-0" />
              <button onClick={() => setBetAmount(v => Math.max(1, Math.floor(v / 2)))}
                className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium">½</button>
              <button onClick={() => setBetAmount(v => v * 2)}
                className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 rounded font-medium">2x</button>
            </div>
            <p className="text-white/30 text-xs text-center">
              Acertar tudo = até <span className="text-white font-bold">R$ {(betAmount * QUESTIONS.reduce((a, q) => a + q.multiplier, 0)).toFixed(2)}</span> de retorno
            </p>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={startGame}
            disabled={betAmount > balance || betAmount <= 0}
            className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40"
            style={{ background: ACCENT }}>
            Começar o Quiz
          </motion.button>

          <button onClick={() => setPhase("ranking")}
            className="w-full py-3 rounded-xl text-white/50 font-semibold text-sm transition-all hover:text-white flex items-center justify-center gap-2"
            style={{ background: PANEL_BG }}>
            <Trophy size={15} /> Ver Ranking
          </button>
        </motion.div>
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
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Trophy size={32} className="text-white/10" />
            <p className="text-white/30 text-sm">Nenhuma partida ainda</p>
          </div>
        )}
        {scores.map((s, i) => {
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: PANEL_BG, border: s.username === username ? `1px solid ${ACCENT}33` : "1px solid transparent" }}>
              <span className="w-7 text-center text-sm font-bold" style={{ color: i < 3 ? "white" : "rgba(255,255,255,0.3)" }}>
                {i < 3 ? medals[i] : i + 1}
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
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md flex flex-col gap-5 items-center text-center">
            <div className="text-7xl">{perfect ? "👑" : finalCorrect >= 6 ? "🏆" : finalCorrect >= 4 ? "⚔️" : "💀"}</div>
            <div>
              <h2 className="text-white text-2xl font-bold mb-1">
                {perfect ? "Perfeito!" : finalCorrect >= 6 ? "Muito bem!" : finalCorrect >= 4 ? "Sobreviveu..." : "A Peste te pegou"}
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
              {perfect && (
                <div className="rounded-lg p-3 mt-1" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <p className="text-green-400 text-xs font-semibold">🎉 Bonus de +R$ 500 por acertar tudo!</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={() => setPhase("ranking")}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/70 flex items-center justify-center gap-2"
                style={{ background: PANEL_BG }}>
                <Trophy size={15} /> Ranking
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
  const isWrong   = selected !== null && selected !== q.correct;

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: PAGE_BG }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <button onClick={() => router.push("/cassino")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Cassino
        </button>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{current + 1}/8</span>
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Clock size={12} />
            <span>R$ {betAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 gap-4 max-w-xl mx-auto w-full">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i < current ? "#10B981" : i === current ? q.themeColor : "rgba(255,255,255,0.1)",
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }} />
          ))}
        </div>

        {/* Theme badge */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: q.themeBg, color: q.themeColor, border: `1px solid ${q.themeColor}30` }}>
            {q.icon}
            <span>{q.theme}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/50">{q.researcher}</span>
          </motion.div>
        </AnimatePresence>

        {/* Timer */}
        <div className="w-full">
          <TimerBar duration={TIMER} onEnd={handleTimeUp} running={timerRunning && !answered} />
        </div>

        {/* Multiplier badge */}
        <div className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 py-1.5"
          style={{ background: "rgba(255,60,0,0.1)", color: ACCENT }}>
          <Zap size={12} /> Acertar = +R$ {(betAmount * q.multiplier).toFixed(2)} ({q.multiplier}x)
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id + "-q"}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="w-full rounded-2xl p-5 text-center"
            style={{ background: PANEL_BG, border: `1px solid ${q.themeColor}20` }}>
            <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="w-full flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const showCorrect = answered && i === q.correct;
            const showWrong = answered && isSelected && i !== q.correct;

            let bg = "rgba(255,255,255,0.03)";
            let border = "rgba(255,255,255,0.06)";
            let textColor = "rgba(255,255,255,0.7)";

            if (showCorrect) { bg = "rgba(16,185,129,0.15)"; border = "#10B981"; textColor = "#10B981"; }
            else if (showWrong) { bg = "rgba(239,68,68,0.15)"; border = "#EF4444"; textColor = "#EF4444"; }
            else if (isSelected) { bg = "rgba(255,60,0,0.12)"; border = ACCENT; textColor = "white"; }

            return (
              <motion.button key={i}
                whileTap={!answered ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className="w-full text-left rounded-xl px-4 py-3.5 text-sm font-medium transition-all flex items-start gap-3"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "rgba(255,255,255,0.08)" }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="leading-snug">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full rounded-xl p-4"
              style={{
                background: timeUp ? "rgba(107,114,128,0.12)" : isCorrect ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${timeUp ? "rgba(107,114,128,0.2)" : isCorrect ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}>
              <p className="font-bold text-sm mb-1"
                style={{ color: timeUp ? "#9CA3AF" : isCorrect ? "#10B981" : "#EF4444" }}>
                {timeUp ? "⏰ Tempo esgotado! -R$ " + betAmount.toFixed(2)
                  : isCorrect ? `✅ Correto! +R$ ${(betAmount * q.multiplier).toFixed(2)}`
                  : `❌ Errado! -R$ ${betAmount.toFixed(2)}`}
              </p>
              <p className="text-white/50 text-xs leading-relaxed">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next button */}
        <AnimatePresence>
          {answered && (
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }} onClick={nextQuestion}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm"
              style={{ background: current + 1 >= QUESTIONS.length ? "#10B981" : ACCENT }}>
              {current + 1 >= QUESTIONS.length ? "Ver Resultado 🏆" : "Próxima Pergunta →"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
