"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLogin: (userId: string, username: string, balance: number) => void;
}

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80&fit=crop",
    title: "Aposte com Emoção",
    subtitle: "Os maiores jogos do mundo nas suas mãos. Odds em tempo real, sempre.",
  },
  {
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=80&fit=crop",
    title: "Champions League",
    subtitle: "Acompanhe e aposte nos maiores clubes da Europa rodada a rodada.",
  },
  {
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&q=80&fit=crop",
    title: "Brasileirão & LaLiga",
    subtitle: "Do Maracanã ao Bernabéu — cada gol pode valer muito mais.",
  },
];

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (!clean) return;
    setIsLoading(true);
    setError(null);

    try {
      let { data: profile, error: fetchError } = await supabase
        .from("netano_profiles")
        .select("*")
        .eq("username", clean)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        const { data: newProfile, error: insertError } = await supabase
          .from("netano_profiles")
          .insert({ username: clean, balance: 1000 })
          .select("*")
          .single();
        if (insertError) throw insertError;
        profile = newProfile;
      } else if (fetchError) {
        throw fetchError;
      }

      if (profile) onLogin(profile.id, profile.username, profile.balance);
    } catch (err: any) {
      setError("Erro ao entrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex">
 
       {/* ── LEFT: Form Panel ─────────────────────────────── */}
       <div className="flex flex-col w-full lg:w-1/2 shrink-0 justify-start lg:justify-center items-center relative min-h-screen">
 
         {/* Mini Carousel top */}
         <div className="lg:hidden w-full h-64 relative overflow-hidden shrink-0">
           <AnimatePresence mode="wait">
             <motion.div
               key={`left-img-${currentSlide}`}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="absolute inset-0"
             >
               <img
                 src={SLIDES[currentSlide].image}
                 alt=""
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808]" />
             </motion.div>
           </AnimatePresence>
         </div>
 
         {/* Form */}
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.3 }}
           className="flex flex-col gap-6 w-full max-w-xl px-10 md:px-16 py-8"
         >
           <div className="flex flex-col gap-3">
             {/* Logo */}
             <div className="w-10 h-10 bg-[#FF3C00] rounded-xl flex items-center justify-center mb-2">
               <img src="/netadologo.webp" alt="Netano" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
             </div>
             <h1 className="text-4xl font-semibold text-white">Entrar</h1>
             <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-md">
               Entre para apostar nos maiores eventos do mundo.
             </p>
           </div>
 
           <form onSubmit={handleLogin} className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
               <input
                 type="text"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 placeholder="Nome de usuário"
                 className="w-full bg-[#121212] text-white font-semibold placeholder-slate-600 rounded-lg px-4 py-4 text-sm border border-white/5 focus:outline-none focus:border-[#FF3C00] transition-all"
                 autoFocus
                 disabled={isLoading}
               />
             </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs font-semibold"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !username.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#FF3C00] hover:bg-[#FF5722] text-white font-medium rounded-lg px-4 py-4 text-base transition-colors disabled:opacity-90 mt-2"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </motion.button>
          </form>

          <p className="text-slate-600 text-xs font-semibold">
            Novo aqui? Sua conta é criada automaticamente ao entrar pela primeira vez com R$ 1.000 de saldo.
          </p>
        </motion.div>

        {/* Footer */}
        <div className="absolute bottom-10 w-full max-w-lg px-10 md:px-16">
          <p className="text-slate-700 text-xs font-semibold">
            © 2025 Netano · Apostas Esportivas
          </p>
        </div>
      </div>

      {/* ── RIGHT: Hero Image Panel (exact 50%) ──────────── */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <img
              src={SLIDES[currentSlide].image}
              alt="Netano Hero"
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay para destacar o texto */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Bottom Text */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentSlide}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-5xl font-semibold text-white mb-2 drop-shadow-lg">
                {SLIDES[currentSlide].title}
              </h2>
              <p className="text-white/80 text-base font-light max-w-md drop-shadow-lg">
                {SLIDES[currentSlide].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Slide dots */}
          <div className="flex gap-2 mt-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentSlide ? "w-12 bg-[#FF3C00]" : "w-4 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Top-right favicon badge */}
        <div className="absolute top-8 right-8 z-10 bg-[#FF3C00] w-10 h-10 rounded-xl flex items-center justify-center">
          <img src="/netadologo.webp" alt="Netano" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>
      </div>

    </div>
  );
}
