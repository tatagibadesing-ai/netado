"use client";

import React from "react";
import { MyBets } from "@/components/MyBets";

export default function HistoricoPage() {
  return (
    <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col gap-8">
      <MyBets />
    </main>
  );
}
