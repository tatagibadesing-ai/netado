"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { LegacyUserBlock } from "@/components/LegacyUserBlock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isCheckingAuth, fullName, setFullName, userId } = useBet();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isCheckingAuth && !isLoggedIn && !isLoginPage) {
      router.replace("/login");
    }
  }, [isLoggedIn, isCheckingAuth, isLoginPage, router]);

  // Enquanto verifica auth, mostra spinner (sem flash)
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF3C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Na rota /login, renderiza direto sem navbar/sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Não logado e não é /login — aguardando redirect
  if (!isLoggedIn) return null;

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="relative flex flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </div>

      {!fullName && userId && (
        <LegacyUserBlock userId={userId} onSaved={(name) => setFullName(name)} />
      )}
    </>
  );
}
