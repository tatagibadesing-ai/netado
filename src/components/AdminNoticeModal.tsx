"use client";

import React, { useState } from "react";
import { useBet } from "@/context/BetContext";
import { motion } from "framer-motion";

export function AdminNoticeModal() {
  const { adminNotice, dismissAdminNotice } = useBet();
  const [loading, setLoading] = useState(false);

  if (!adminNotice) return null;

  const handleDismiss = async () => {
    setLoading(true);
    await dismissAdminNotice();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px]">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-notice-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-[#121212] p-6 sm:p-8 border border-white/5 shadow-2xl"
      >
        <div className="relative z-10 text-center flex flex-col items-center">
          <h2 id="admin-notice-title" className="mb-2 text-2xl font-semibold tracking-tight text-white font-sans">
            Aviso do Administrador
          </h2>
          <p className="px-2 text-sm font-medium leading-relaxed text-slate-300 font-sans">
            {adminNotice}
          </p>
        </div>

        <div className="relative z-10 mt-6">
          <button
            onClick={handleDismiss}
            disabled={loading}
            className="w-full rounded-xl bg-[#FF3C00] px-5 py-4 text-base font-bold text-white shadow-lg shadow-[#FF3C00]/20 transition-all hover:bg-[#FF5722] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processando..." : "Entendido"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
