"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

interface Props {
  userId: string;
  onSaved: (name: string) => void;
}

export function LegacyUserBlock({ userId, onSaved }: Props) {
  const [fullNameInput, setFullNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullNameInput.trim();
    
    // Validação de nome completo (nome + sobrenome)
    if (cleanName.length < 3 || !cleanName.includes(" ")) {
      setError("Por favor, informe seu nome completo (nome e sobrenome).");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("netano_profiles")
        .update({ full_name: cleanName })
        .eq("id", userId);
        
      if (err) {
        setError("Erro ao atualizar cadastro. Tente novamente.");
      } else {
        onSaved(cleanName);
      }
    } catch {
      setError("Erro ao atualizar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px]">
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="legacy-user-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-[#121212] p-6 sm:p-8"
      >
        {/* Textura da Copa concentrada no topo do popup. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-95"
          style={{
            backgroundImage: "url('/svgpartedacopa.svg')",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(18, 18, 18, 0.35) 48%, #121212 88%)",
          }}
        />

        <div className="relative z-10 pt-10 text-center">
          <h2 id="legacy-user-title" className="mb-2 text-2xl font-semibold tracking-tight text-white">
            Identificação Obrigatória
          </h2>
          <p className="px-2 text-sm font-medium leading-relaxed text-slate-200">
            Apenas os usuários que colocarem o <span className="text-[#FF3C00] font-bold">nome completo original</span> estarão concorrendo aos prêmios do Bolão da Copa!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 mt-6 flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={fullNameInput}
              onChange={(e) => setFullNameInput(e.target.value)}
              placeholder="Nome completo (ex: Pedro Silva)"
              className="w-full rounded-xl border border-white/5 bg-black/35 px-5 py-4 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-[#FF3C00]/60 focus:outline-none focus:ring-2 focus:ring-[#FF3C00]/30"
              disabled={loading}
              autoFocus
            />
            <p className="px-2 text-center text-[11px] font-medium leading-relaxed text-slate-400">
              O nome precisa ter pelo menos um sobrenome.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !fullNameInput.trim()}
            className="mt-2 w-full rounded-xl bg-[#FF3C00] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#FF3C00]/20 transition-all hover:bg-[#FF5722] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Confirmar Nome Completo"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
