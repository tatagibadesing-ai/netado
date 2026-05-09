"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ── Games Data ──────────────────────────────────────── */

const GAMES = [
  { id: "crash",  name: "Crash",  label: "Netano Originals", img: "/crashgamenetado.webp",  accent: "#FF3C00" },
  { id: "double", name: "Double", label: "Netano Originals", img: "/doublenetano.webp",      accent: "#FF3C00" },
  { id: "mines",  name: "Mines",  label: "Netano Originals", img: "/minesgamenetado.webp",   accent: "#FF3C00" },
  { id: "derby",  name: "DerbyNetano", label: "Netano Originals", img: "/derbynetano.webp",  accent: "#FF3C00" },
  { id: "slots",  name: "Slots",  label: "Netano Originals", img: "/Slotmachinenetano.webp", accent: "#FF3C00" },
  { id: "plinko", name: "Plinko", label: "Netano Originals", img: "/plinkogamenetano.webp",  accent: "#FF3C00" },
  { id: "dice",   name: "Dice",   label: "Netano Originals", img: "/dicenetano.webp",        accent: "#FF3C00" },
  // { id: "quiz",   name: "Quiz",   label: "Netano Originals", img: "/quiznetano.webp",        accent: "#FF3C00" },
];

/* ── Coming Soon Modal ───────────────────────────────── */

function ComingSoonModal({ game, onClose }: { game: (typeof GAMES)[0]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#161616] rounded-2xl overflow-hidden max-w-xs w-full border border-white/5"
      >
        <div className="h-48 overflow-hidden">
          <img src={game.img} alt={game.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-1">{game.name}</h2>
          <p className="text-white/40 text-sm font-normal mb-5">Em breve! Este jogo está sendo desenvolvido.</p>
          <button onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: "#FF3C00" }}>
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Games Carousel ──────────────────────────────────── */

function GamesCarousel({ onPlay }: { onPlay: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const GAP = 16;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const N = isMobile ? 2.3 : 7;
  const maxOffset = Math.max(0, GAMES.length - Math.floor(N));

  const prev = () => setOffset(o => Math.max(0, o - 1));
  const next = () => setOffset(o => Math.min(maxOffset, o + 1));

  const cardW = isMobile
    ? `calc((100% - ${GAP}px) / 2.3)`
    : `calc((100% - ${6 * GAP}px) / 7)`;
  const stepX = isMobile
    ? `calc((100% - ${GAP}px) / 2.3 + ${GAP}px)`
    : `calc((100% - ${6 * GAP}px) / 7 + ${GAP}px)`;

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -40) next();
    else if (info.offset.x > 40) prev();
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-white text-2xl tracking-wide" style={{ fontWeight: 700 }}>Originais</h2>
        <div className="flex items-center gap-1">
          <button onClick={prev} disabled={offset === 0}
            className="w-7 h-7 rounded-full bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-30 flex items-center justify-center text-white transition-all">
            <ChevronLeft size={14} />
          </button>
          <button onClick={next} disabled={offset >= maxOffset}
            className="w-7 h-7 rounded-full bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-30 flex items-center justify-center text-white transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        {/* fade right */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
          style={{ background: "linear-gradient(to right, transparent, #0d0d0d)" }} />

        <motion.div
          className="flex gap-4 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={{ x: offset === 0 ? 0 : `calc(-${offset} * (${stepX}))` }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
        >
          {GAMES.map((game) => (
            <motion.button
              key={game.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlay(game.id)}
              className="group relative rounded-xl overflow-hidden bg-[#1a1a1a] cursor-pointer"
              style={{ width: cardW, minWidth: cardW, flexShrink: 0, aspectRatio: "3/4" }}
            >
              <img
                src={game.img}
                alt={game.name}
                className="w-full"
                style={{ height: "118%", objectFit: "cover", objectPosition: "top" }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#FF3C00] text-white font-semibold text-xs px-4 py-2 rounded-md">
                  Jogar
                </span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Casino Page ─────────────────────────────────────── */

export default function CassinoPage() {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const activeGameData = GAMES.find(g => g.id === activeGame);

  const handlePlay = (id: string) => {
    if (id === "derby") {
      router.push("/derby");
      return;
    }
    if (id === "crash" || id === "double" || id === "mines" || id === "dice" || id === "plinko" || id === "slots") {
      router.push(`/cassino/${id}`);
    } else {
      setActiveGame(id);
    }
  };

  return (
    <>
      <main className="flex-1 w-full bg-[#0d0d0d] flex flex-col">
        <div className="max-w-[1400px] mx-auto w-full p-4 lg:px-8 lg:pt-8 lg:pb-8 flex flex-col gap-6">

          {/* Banner */}
          <div className="relative w-full rounded-2xl overflow-hidden max-h-[220px] md:max-h-[260px]">
            <img
              src="/bannercassino-v2.webp"
              alt="Cassino Netano"
              className="w-full h-full object-cover scale-[1.45] md:scale-100 origin-left md:origin-center object-[0%_45%] md:object-[center_40%] -translate-x-[11%] md:translate-x-0"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-12">
              <p className="text-white/70 text-xs md:text-sm font-semibold tracking-wide mb-1">Originais Netano</p>
              <h2 className="text-white text-2xl md:text-4xl leading-tight mb-2" style={{ fontWeight: 700 }}>
                Aproveite já os<br />melhores jogos!
              </h2>
              <p className="text-white/60 text-xs md:text-sm font-medium hidden md:block">
                Crash, Double, Mines e muito mais. Jogue agora!
              </p>
            </div>
          </div>

          {/* Games carousel */}
          <GamesCarousel onPlay={handlePlay} />

        </div>
      </main>

      <AnimatePresence>
        {activeGame && activeGameData && (
          <ComingSoonModal key={activeGame} game={activeGameData} onClose={() => setActiveGame(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
