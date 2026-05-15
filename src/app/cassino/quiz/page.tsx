"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

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
    question: "Antes da Grande Fome de 1315, a Europa vinha de um período de forte crescimento populacional. Qual foi o principal problema que isso causou quando as colheitas começaram a falhar?",
    options: [
      "Sobrava comida demais e os preços despencaram",
      "Havia gente demais para a pouca comida produzida pelas terras esgotadas",
      "Os nobres exportaram toda a comida para a Ásia",
      "Os camponeses pararam de trabalhar em protesto",
    ],
    correct: 1,
    explanation: "Entre 1100 e 1300 a população europeia quase dobrou. Quando as más colheitas vieram (chuvas excessivas de 1315-1317), as terras já estavam exauridas e não havia comida suficiente para tanta gente. Por isso a fome foi tão devastadora.",
    multiplier: 1.8,
  },
  {
    id: 2,
    theme: "Fome e Crise Agrícola",
    question: "A Grande Fome (1315–1317) foi tão extrema que relatos da época, como os de Bristol, descrevem que tipo de horror entre os famintos?",
    options: [
      "Camponeses migrando em massa para a África",
      "Casos de canibalismo, incluindo pais comendo os próprios filhos",
      "Pessoas pagando imposto em ossos de animais",
      "Reis distribuindo toda sua comida igualmente ao povo",
    ],
    correct: 1,
    explanation: "Crônicas medievais documentam casos extremos de canibalismo durante a Grande Fome. A crise agrícola somada ao crescimento populacional gerou um colapso econômico e social que matou de 10% a 25% da população em várias regiões.",
    multiplier: 2.0,
  },
  {
    id: 3,
    theme: "Peste",
    question: "A Peste Negra (1347-1352) se espalhou pela Europa principalmente por dois vetores. Quais eram?",
    options: [
      "Vento e água contaminada",
      "Mordidas de morcego e aranhas",
      "Ratos e pulgas que viviam neles",
      "Beijos e abraços entre nobres",
    ],
    correct: 2,
    explanation: "A bactéria Yersinia pestis era transmitida principalmente por pulgas que viviam em ratos. Os ratos chegavam nos navios mercantes e infestavam as cidades — quando morriam, as pulgas pulavam nos humanos. A falta de saneamento medieval acelerou tudo.",
    multiplier: 1.7,
  },
  {
    id: 4,
    theme: "Peste",
    question: "A Peste Negra matou milhões e gerou caos social. Qual reação comum aconteceu na Europa por causa do medo e da falta de explicação científica?",
    options: [
      "As pessoas pararam de acreditar em Deus completamente",
      "Foram criadas as primeiras universidades de medicina",
      "Perseguições e massacres de minorias (como judeus) acusados de causar a peste",
      "Os reis aboliram o cristianismo em toda a Europa",
    ],
    correct: 2,
    explanation: "Sem explicação para a doença, populações inteiras buscaram culpados. Comunidades judaicas foram massacradas na Alemanha e França sob a falsa acusação de envenenarem poços. O medo e o caos social marcaram tanto quanto a doença em si.",
    multiplier: 2.0,
  },
  {
    id: 5,
    theme: "Guerra dos Cem Anos",
    question: "A Guerra dos Cem Anos (1337–1453) entre França e Inglaterra teve qual consequência política importante a longo prazo?",
    options: [
      "Enfraqueceu os reis e devolveu o poder aos senhores feudais",
      "Fortaleceu o poder dos reis e enfraqueceu a nobreza feudal",
      "Uniu Inglaterra e França em um só reino",
      "Fez a Igreja Católica controlar os dois países",
    ],
    correct: 1,
    explanation: "A guerra exigiu exércitos permanentes pagos pelos reis (não mais pelos nobres). Isso centralizou o poder real e enfraqueceu os senhores feudais, que dependiam de suas próprias tropas. Foi um passo decisivo para o nascimento dos Estados-nação modernos.",
    multiplier: 1.8,
  },
  {
    id: 6,
    theme: "Crise do Feudalismo",
    question: "Com tanta gente morta pela peste e pelas guerras, o que aconteceu nas relações de trabalho do final da Idade Média?",
    options: [
      "Os camponeses ficaram mais escravizados do que nunca",
      "Faltou mão de obra, e os trabalhadores passaram a exigir melhores salários",
      "Os nobres começaram a trabalhar nas próprias terras",
      "A Igreja proibiu qualquer pagamento aos camponeses",
    ],
    correct: 1,
    explanation: "Com a população reduzida pela peste, havia muito mais terra do que trabalhadores. Camponeses passaram a negociar salários mais altos e a abandonar feudos opressores. Foi um dos golpes mais duros no sistema feudal.",
    multiplier: 1.8,
  },
  {
    id: 7,
    theme: "Crise do Feudalismo",
    question: "Junto com o enfraquecimento dos senhores feudais, qual movimento populacional marcou o fim da Idade Média?",
    options: [
      "Êxodo rural — camponeses migraram para as cidades em busca de trabalho no comércio",
      "Migração em massa para a América",
      "Volta dos camponeses para as florestas como caçadores",
      "Todos os camponeses foram morar em mosteiros",
    ],
    correct: 0,
    explanation: "Com a crise no campo e o crescimento das atividades comerciais e artesanais nos burgos, milhares de camponeses migraram para as cidades. Esse êxodo rural alimentou a ascensão da burguesia urbana e o renascimento comercial europeu.",
    multiplier: 2.0,
  },
  {
    id: 8,
    theme: "Revoltas Sociais",
    question: "No final da Idade Média, revoltas camponesas como a Jacquerie (1358) na França e a Revolta de Wat Tyler (1381) na Inglaterra explodiram pelo mesmo motivo principal. Qual?",
    options: [
      "Os nobres queriam que os camponeses se alistassem nas Cruzadas",
      "A Igreja proibiu o consumo de pão branco",
      "Altos impostos cobrados pelos reis e nobres sobre uma população já empobrecida",
      "Os camponeses queriam adotar a língua latina obrigatoriamente",
    ],
    correct: 2,
    explanation: "Reis e nobres aumentaram impostos para financiar guerras (como a dos Cem Anos) sobre uma população já devastada pela peste e pela fome. A insatisfação popular explodiu em revoltas violentas contra a nobreza, marcando o fim do mundo feudal.",
    multiplier: 2.0,
  },
];

/* ── Ranking (top scores armazenados localmente) ────── */

type AvatarBaseId = "ufo-cacto" | "gel-plug" | "dado-mago" | "lua-chef" | "gato-cogumelo" | "lava-skater";
type AvatarColorId = "original" | "slime" | "arcade" | "lunar" | "quente";
type AvatarOutfitId = "none" | "raio" | "orbita" | "glitch" | "medalha";
type AvatarConfig = { base: AvatarBaseId; color: AvatarColorId; outfit: AvatarOutfitId; };

interface ScoreEntry { username: string; score: number; correct: number; date: string; avatar?: AvatarConfig; }

const AVATAR_BASES: { id: AvatarBaseId; label: string; image: string; tone: string }[] = [
  { id: "ufo-cacto", label: "UFO Cacto", image: "/quiz-characters/ufo-cacto.png", tone: "#FF3C00" },
  { id: "gel-plug", label: "Gel Plug", image: "/quiz-characters/gel-plug.png", tone: "#B45CFF" },
  { id: "dado-mago", label: "Dado Mago", image: "/quiz-characters/dado-mago.png", tone: "#00C2B8" },
  { id: "lua-chef", label: "Lua Chef", image: "/quiz-characters/lua-chef.png", tone: "#F7D46A" },
  { id: "gato-cogumelo", label: "Gato Cone", image: "/quiz-characters/gato-cogumelo.png", tone: "#FF7A1A" },
  { id: "lava-skater", label: "Lava Skate", image: "/quiz-characters/lava-skater.png", tone: "#1DCFD1" },
];

const AVATAR_COLORS: { id: AvatarColorId; label: string; swatch: string; filter: string }[] = [
  { id: "original", label: "Original", swatch: ACCENT, filter: "none" },
  { id: "slime", label: "Slime", swatch: GREEN, filter: "hue-rotate(76deg) saturate(1.16) contrast(1.04)" },
  { id: "arcade", label: "Arcade", swatch: "#1368CE", filter: "hue-rotate(188deg) saturate(1.2) contrast(1.05)" },
  { id: "lunar", label: "Lunar", swatch: "#f5f5f5", filter: "grayscale(0.24) saturate(0.88) brightness(1.05)" },
  { id: "quente", label: "Quente", swatch: "#E21B3C", filter: "hue-rotate(320deg) saturate(1.28) contrast(1.04)" },
];

const AVATAR_OUTFITS: { id: AvatarOutfitId; label: string }[] = [
  { id: "none", label: "Basico" },
  { id: "raio", label: "Raio" },
  { id: "orbita", label: "Orbita" },
  { id: "glitch", label: "Glitch" },
  { id: "medalha", label: "Medalha" },
];

const AVATAR_OUTFIT_ASSETS: Record<Exclude<AvatarOutfitId, "none">, { src: string; className: string; sizes: string }> = {
  raio: {
    src: "/quiz-artifacts/raio.png",
    className: "right-[3%] top-[1%] h-[34%] w-[34%] rotate-12",
    sizes: "60px",
  },
  orbita: {
    src: "/quiz-artifacts/orbita.png",
    className: "inset-[1%] h-[98%] w-[98%]",
    sizes: "176px",
  },
  glitch: {
    src: "/quiz-artifacts/glitch.png",
    className: "left-[2%] top-[32%] h-[30%] w-[42%] -rotate-6",
    sizes: "74px",
  },
  medalha: {
    src: "/quiz-artifacts/medalha.png",
    className: "bottom-[2%] right-[2%] h-[32%] w-[32%]",
    sizes: "56px",
  },
};

const DEFAULT_AVATAR: AvatarConfig = { base: "ufo-cacto", color: "original", outfit: "none" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAvatarBase(value: unknown): value is AvatarBaseId {
  return typeof value === "string" && AVATAR_BASES.some(item => item.id === value);
}

function isAvatarColor(value: unknown): value is AvatarColorId {
  return typeof value === "string" && AVATAR_COLORS.some(item => item.id === value);
}

function isAvatarOutfit(value: unknown): value is AvatarOutfitId {
  return typeof value === "string" && AVATAR_OUTFITS.some(item => item.id === value);
}

function normalizeAvatar(value: unknown): AvatarConfig {
  if (!isRecord(value)) return DEFAULT_AVATAR;
  const savedColor = isAvatarColor(value.color) ? value.color : isAvatarColor(value.outfit) ? value.outfit : DEFAULT_AVATAR.color;
  const savedOutfit = isAvatarOutfit(value.outfit) ? value.outfit : isAvatarOutfit(value.accessory) ? value.accessory : DEFAULT_AVATAR.outfit;

  return {
    base: isAvatarBase(value.base) ? value.base : DEFAULT_AVATAR.base,
    color: savedColor,
    outfit: savedOutfit,
  };
}

function getSavedAvatar(): AvatarConfig {
  try { return normalizeAvatar(JSON.parse(localStorage.getItem("quiz_avatar") || "null")); } catch { return DEFAULT_AVATAR; }
}

async function fetchTopScores(): Promise<ScoreEntry[]> {
  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("quiz_scores")
    .select("username, score, correct, created_at, avatar")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return data.map((d: { username: string; score: number; correct: number; created_at: string; avatar: AvatarConfig | null }) => ({
    username: d.username,
    score: d.score,
    correct: d.correct,
    date: new Date(d.created_at).toLocaleDateString("pt-BR"),
    avatar: d.avatar ?? undefined,
  }));
}

async function saveScoreToDb(userId: string, entry: ScoreEntry) {
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("quiz_scores").insert({
    user_id: userId,
    username: entry.username,
    score: entry.score,
    correct: entry.correct,
    total: 8,
    avatar: entry.avatar ?? null,
  });
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

/* ── Avatar ────────────────────────────────────────── */
function AvatarOutfitLayer({ outfit }: { outfit: AvatarOutfitId }) {
  if (outfit === "none") return null;
  const artifact = AVATAR_OUTFIT_ASSETS[outfit];

  return (
    <Image
      src={artifact.src}
      alt=""
      width={256}
      height={256}
      sizes={artifact.sizes}
      draggable={false}
      className={`pointer-events-none absolute object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)] ${artifact.className}`}
    />
  );
}

function AvatarDisplay({ avatar, className = "" }: { avatar: AvatarConfig; className?: string }) {
  const base = AVATAR_BASES.find(item => item.id === avatar.base) ?? AVATAR_BASES[0];
  const color = AVATAR_COLORS.find(item => item.id === avatar.color) ?? AVATAR_COLORS[0];

  return (
    <div className={`relative isolate ${className}`} role="img" aria-label={`Avatar ${base.label}`}>
      <Image
        src={base.image}
        alt=""
        width={512}
        height={512}
        sizes="176px"
        className="h-full w-full object-contain"
        draggable={false}
        style={{ filter: `${color.filter} drop-shadow(0 14px 20px rgba(0,0,0,0.32))` }}
      />
      <AvatarOutfitLayer outfit={avatar.outfit} />
    </div>
  );
}

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
type Phase = "lobby" | "mascot" | "playing" | "result" | "ranking";

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
  const [timerRunning, setTimerRunning] = useState(false);
  const [moneyFlash, setMoneyFlash] = useState<{ id: number; amount: number; won: boolean } | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  // Carrega o top 10 global do banco sempre que entrar no ranking ou no result
  useEffect(() => {
    if (phase === "ranking" || phase === "result") {
      fetchTopScores().then(setScores);
    }
  }, [phase]);
  const [avatar, setAvatar] = useState<AvatarConfig>(() =>
    typeof window === "undefined" ? DEFAULT_AVATAR : getSavedAvatar()
  );
  const flashIdRef = useRef(0);

  const q = QUESTIONS[current];
  const TIMER = 20;

  useEffect(() => {
    localStorage.setItem("quiz_avatar", JSON.stringify(avatar));
  }, [avatar]);

  function startGame() {
    if (betAmount <= 0 || betAmount > balance) return;
    getAudio();
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setTotalWon(0);
    setTotalLost(0);
    setMoneyFlash(null);
    setTimerRunning(false);
    setPhase("mascot");
  }

  function startQuestions() {
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
        avatar,
      };
      if (userId) {
        saveScoreToDb(userId, entry).then(() => fetchTopScores().then(setScores));
      }
      setPhase("result");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
      setMoneyFlash(null);
      setTimerRunning(true);
    }
  }

  const finalCorrect = correctCount;
  const canStart = betAmount > 0 && betAmount <= balance;
  const totalPotential = betAmount * QUESTIONS.reduce((sum, item) => sum + item.multiplier, 0);
  const selectedMascotIndex = Math.max(0, AVATAR_BASES.findIndex(item => item.id === avatar.base));
  const selectedMascot = AVATAR_BASES[selectedMascotIndex] ?? AVATAR_BASES[0];
  const previousMascot = AVATAR_BASES[(selectedMascotIndex - 1 + AVATAR_BASES.length) % AVATAR_BASES.length];
  const nextMascot = AVATAR_BASES[(selectedMascotIndex + 1) % AVATAR_BASES.length];

  function cycleMascot(direction: -1 | 1) {
    const nextIndex = (selectedMascotIndex + direction + AVATAR_BASES.length) % AVATAR_BASES.length;
    setAvatar(currentAvatar => ({ ...currentAvatar, base: AVATAR_BASES[nextIndex].id }));
  }

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

  /* ── Mascot ── */
  const renderMascotControls = () => (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 text-left">
      <div>
        <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden md:min-h-[390px]">
          <button
            type="button"
            onClick={() => cycleMascot(-1)}
            className="absolute left-[calc(50%-180px)] z-10 grid h-11 w-11 place-items-center text-white/45 transition-colors hover:text-white md:left-[calc(50%-230px)] md:h-12 md:w-12"
            title="Mascote anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="pointer-events-none absolute left-[calc(50%-305px)] hidden opacity-25 brightness-50 sm:block md:left-[calc(50%-390px)]">
            <AvatarDisplay avatar={{ ...avatar, base: previousMascot.id }} className="h-44 w-44 md:h-56 md:w-56" />
          </div>

          <div className="pointer-events-none absolute right-[calc(50%-305px)] hidden opacity-25 brightness-50 sm:block md:right-[calc(50%-390px)]">
            <AvatarDisplay avatar={{ ...avatar, base: nextMascot.id }} className="h-44 w-44 md:h-56 md:w-56" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-3 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={avatar.base}
                initial={{ opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -26 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col items-center gap-3"
              >
                <AvatarDisplay avatar={avatar} className="h-64 w-64 md:h-80 md:w-80" />
                <div className="text-center">
                  <p className="text-base font-black text-white">{selectedMascot.label}</p>
                  <p className="text-xs font-medium text-white/35">
                    {selectedMascotIndex + 1} / {AVATAR_BASES.length}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => cycleMascot(1)}
            className="absolute right-[calc(50%-180px)] z-10 grid h-11 w-11 place-items-center text-white/45 transition-colors hover:text-white md:right-[calc(50%-230px)] md:h-12 md:w-12"
            title="Proximo mascote"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-white/30">Cor</p>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_COLORS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAvatar(currentAvatar => ({ ...currentAvatar, color: item.id }))}
              className="h-11 rounded transition-transform active:scale-95"
              style={{
                background: item.swatch,
                outline: avatar.color === item.id ? "2px solid white" : "1px solid rgba(255,255,255,0.14)",
              }}
              title={item.label}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-white/30">Traje</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {AVATAR_OUTFITS.map(item => {
            const selected = avatar.outfit === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAvatar(currentAvatar => ({ ...currentAvatar, outfit: item.id }))}
                className="flex h-14 items-center justify-center rounded px-2 text-xs font-bold transition-colors"
                style={{
                  background: selected ? ACCENT : "transparent",
                  color: selected ? "white" : "rgba(255,255,255,0.55)",
                  outline: selected ? "none" : "1px solid rgba(255,255,255,0.08)",
                }}
                title={item.label}
              >
                {item.id === "none" ? (
                  item.label
                ) : (
                  <Image src={AVATAR_OUTFIT_ASSETS[item.id].src} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={startQuestions}
        className="w-full rounded py-3.5 text-sm font-bold text-white transition-transform active:scale-95"
        style={{ background: ACCENT }}
      >
        Comecar perguntas
      </button>
    </div>
  );

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
            <h1 className="text-white text-4xl md:text-6xl font-black leading-none mb-3">Quiz</h1>
            <p className="text-white/55 text-sm md:text-lg font-medium mb-6">
              Configure sua aposta e comece quando estiver pronto.
            </p>
            <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2 text-left sm:gap-3">
              <div className="rounded bg-[#111] p-2.5 sm:p-4">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white/35">Perguntas</p>
                <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-black text-white">{QUESTIONS.length}</p>
              </div>
              <div className="rounded bg-[#111] p-2.5 sm:p-4">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white/35">Tempo</p>
                <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-black text-white">{TIMER}s</p>
              </div>
              <div className="rounded bg-[#111] p-2.5 sm:p-4">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white/35">Maximo</p>
                <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-black text-white">R$ {totalPotential.toFixed(0)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="md:hidden bg-[#111] flex flex-col gap-3 p-4">
          {renderBetControls()}
        </div>
      </div>
    </div>
  );

  if (phase === "mascot") return (
    <div className="flex-1 flex flex-col bg-[#0d0d0d] min-h-0">
      <div className="flex items-center justify-between px-6 py-3 bg-[#111]">
        <button onClick={() => setPhase("lobby")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-white text-sm font-semibold">Escolha o mascote</span>
        <span className="text-white/40 text-xs">R$ {betAmount.toFixed(2)}</span>
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-6 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-4xl text-center"
        >
          {renderMascotControls()}
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
              <AvatarDisplay avatar={normalizeAvatar(s.avatar)} className="h-12 w-12 shrink-0" />
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
