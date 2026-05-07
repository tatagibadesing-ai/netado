"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLogin: (userId: string, username: string, balance: number) => void;
}

const SLIDES = [
  {
    image: "/login-hero.png",
    title: "Aposte com Emoção",
    subtitle: "Os maiores jogos do mundo nas suas mãos. Odds em tempo real, sempre.",
  },
  {
    image: "/login-hero.png",
    title: "Champions League",
    subtitle: "Acompanhe e aposte nos maiores clubes da Europa rodada a rodada.",
  },
  {
    image: "/login-hero.png",
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
    }, 4000);
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
    <div className="min-h-screen bg-[#0A0A0A] flex">

      {/* ── LEFT: Form Panel ─────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[480px] shrink-0 px-8 md:px-12 py-10 justify-between relative z-10">

        {/* Logo */}
        <div>
          <div className="inline-flex bg-[#FF3C00] px-4 py-2 rounded-lg">
            <img src="/netadologocompleta.webp" alt="Netano" className="h-6 w-auto object-contain" />
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-6"
        >
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Entrar</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Acesse sua conta e aposte nos maiores eventos esportivos do mundo.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nome de usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joao123"
                className="w-full bg-[#161616] text-white placeholder-slate-600 rounded-lg px-4 py-3.5 text-sm border border-white/5 focus:outline-none focus:border-[#FF3C00] transition-all"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !username.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#FF3C00] hover:bg-[#e03500] text-white font-black rounded-lg px-4 py-4 text-sm transition-colors disabled:opacity-40 mt-2"
            >
              {isLoading ? "Entrando..." : "Entrar →"}
            </motion.button>
          </form>

          <p className="text-slate-600 text-xs text-center">
            Novo aqui? Sua conta é criada automaticamente ao entrar pela primeira vez com R$ 1.000 de saldo.
          </p>
        </motion.div>

        {/* Footer */}
        <p className="text-slate-700 text-xs">
          © 2025 Netano · Apostas Esportivas
        </p>
      </div>

      {/* ── RIGHT: Hero Image Panel ──────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden rounded-l-3xl">
        
        {/* Slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <img
              src={SLIDES[currentSlide].image}
              alt="Netano Hero"
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-transparent" style={{ width: "35%" }} />
          </motion.div>
        </AnimatePresence>

        {/* Bottom Text */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${currentSlide}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-black text-white mb-2">
                {SLIDES[currentSlide].title}
              </h2>
              <p className="text-slate-400 text-sm max-w-sm">
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
                  i === currentSlide ? "w-6 bg-[#FF3C00]" : "w-2 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Top-right logo badge */}
        <div className="absolute top-8 right-8 z-10 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
          <img src="/netadologocompleta.webp" alt="Netano" className="h-5 w-auto object-contain" />
        </div>
      </div>

    </div>
  );
}
