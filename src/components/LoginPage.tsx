"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface LoginPageProps {
  onLogin: (userId: string, username: string, balance: number) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (!clean) return;
    setIsLoading(true);
    setError(null);

    try {
      // Tenta buscar o perfil existente
      let { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", clean)
        .single();

      // Se não existe, cria um novo perfil
      if (fetchError && fetchError.code === "PGRST116") {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ username: clean, balance: 1000 })
          .select("*")
          .single();

        if (insertError) throw insertError;
        profile = newProfile;
      } else if (fetchError) {
        throw fetchError;
      }

      if (profile) {
        onLogin(profile.id, profile.username, profile.balance);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao entrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#FF3C00] px-6 py-3 rounded-xl">
            <img
              src="/netadologocompleta.webp"
              alt="Netano"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>

        <div className="bg-[#121212] rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Entrar</h1>
          <p className="text-slate-500 text-sm mb-6">
            Digite um nome de usuário para continuar
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="w-full bg-[#1E1E1E] text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF3C00] transition-all"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || !username.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#FF3C00] text-white font-bold rounded-lg px-4 py-3 text-sm transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Entrando..." : "Entrar →"}
            </motion.button>
          </form>

          <p className="text-slate-600 text-xs text-center mt-4">
            Novo usuário? Sua conta será criada automaticamente.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
