"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBet } from "@/context/BetContext";
import { LoginPage } from "@/components/LoginPage";

export default function LoginRoute() {
  const { isLoggedIn, isCheckingAuth, login } = useBet();
  const router = useRouter();

  useEffect(() => {
    if (!isCheckingAuth && isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, isCheckingAuth, router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF3C00] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isLoggedIn) return null;

  return <LoginPage onLogin={(uid, uname, bal) => { login(uid, uname, bal); router.replace("/"); }} />;
}
