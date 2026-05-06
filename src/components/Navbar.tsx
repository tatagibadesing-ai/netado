"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { useBet } from "../context/BetContext";

export function Navbar() {
  const { balance } = useBet();

  return (
    <header className="bg-[#121212] border-b border-[#1a1a1a] sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
            Netano<span className="text-[#FF3C00]">.</span>
          </h1>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Saldo
            </span>
            <span className="font-bold text-[#FF3C00] flex items-center gap-1.5">
              R$ {balance.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 bg-[#080808] rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#FF3C00]" />
          </div>
        </div>
      </div>
    </header>
  );
}
