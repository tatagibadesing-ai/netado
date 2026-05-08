"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, LogOut, Users } from "lucide-react";
import { useBet } from "../context/BetContext";
import { supabase } from "@/lib/supabase";
import { AnimatePresence } from "framer-motion";
import { FriendsModal } from "@/components/FriendsModal";

export function Navbar() {
  const { balance, username, logout, userId } = useBet();
  const pathname = usePathname();
  const [showFriends, setShowFriends] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const tabs = [
    { label: "Apostas Esportivas", href: "/apostasesportivas" },
    { label: "Cassino", href: "/cassino" },
    { label: "Histórico", href: "/historico" },
  ];

  // Carrega contagem de convites pendentes
  useEffect(() => {
    if (!userId) return;
    loadPendingCount();

    const channel = supabase
      .channel("navbar-friendships-" + userId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "netano_friendships",
        filter: `addressee_id=eq.${userId}`,
      }, loadPendingCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function loadPendingCount() {
    if (!userId) return;
    const { count } = await supabase
      .from("netano_friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", userId)
      .eq("status", "pending");
    setPendingCount(count ?? 0);
  }

  return (
    <>
      <header className="bg-[#FF3C00] sticky top-0 z-50">
        <div className="w-full mx-auto px-4 lg:px-8 pt-3 pb-0 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">

          {/* Top Row on Mobile: Logo & Balance */}
          <div className="flex items-center justify-between w-full md:w-auto md:h-full pb-1 md:pb-0">
            {/* Logo */}
            <Link href="/apostasesportivas" className="flex items-center gap-2 w-[120px] md:w-[200px]">
              <img
                src="/netadologocompleta.webp"
                alt="Netano"
                className="h-5 md:h-7 w-auto object-contain cursor-pointer"
              />
            </Link>

            {/* Mobile: balance + friends */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setShowFriends(true)}
                className="relative w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0"
              >
                <Users className="w-4 h-4 text-white" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-[#FF3C00] text-[10px] font-black flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              <div className="flex flex-col items-end">
                <span className="font-black text-white flex items-center gap-1 text-sm">
                  R$ {balance.toFixed(2)}
                </span>
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="flex items-center gap-6 md:gap-8 justify-start md:justify-center flex-1 overflow-x-auto no-scrollbar md:h-full">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center md:h-full border-b-[3px] pb-2 md:pb-0 pt-1 md:pt-0 transition-all whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-wider ${
                  pathname === tab.href
                    ? "border-white text-white"
                    : "border-transparent text-white/90 hover:text-white hover:border-white/60"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Balance + Friends + User (Desktop only) */}
          <div className="hidden md:flex items-center gap-3 justify-end h-full">
            <div className="flex flex-col items-end">
              <span className="text-xs text-white/70 font-medium">{username}</span>
              <span className="font-black text-white text-lg">R$ {balance.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={() => setShowFriends(true)}
              title="Amigos"
              className="relative w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors shrink-0"
            >
              <Users className="w-4 h-4 text-white" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-[#FF3C00] text-[10px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              title="Sair"
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>
      </header>

      <AnimatePresence>
        {showFriends && <FriendsModal onClose={() => setShowFriends(false)} />}
      </AnimatePresence>
    </>
  );
}
