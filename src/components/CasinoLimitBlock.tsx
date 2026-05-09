"use client";

import { useRouter } from "next/navigation";
import { MAX_BET_CREDITS, MAX_TIME_SECS } from "@/lib/casinoLimit";

interface Props {
  betCreditsUsed: number;
  timeSecsUsed:   number;
  betBlocked:     boolean;
  timeBlocked:    boolean;
}

export default function CasinoLimitBlock({ betCreditsUsed, timeSecsUsed, betBlocked, timeBlocked }: Props) {
  const router = useRouter();

  const timeMins = Math.floor(MAX_TIME_SECS / 60);
  const usedMins = Math.floor(timeSecsUsed / 60);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center" style={{ background: "#0d0d0d" }}>
      <div className="text-5xl">🛑</div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Limite diário atingido</h2>
        <p className="text-sm text-white/50 max-w-xs leading-relaxed">
          {timeBlocked
            ? `Você jogou ${usedMins} minutos hoje — o limite é ${timeMins} min/dia.`
            : `Você usou ${betCreditsUsed} de ${MAX_BET_CREDITS} créditos de aposta hoje.`}
          {" "}Volte amanhã para continuar jogando!
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className="rounded-lg px-4 py-2 text-xs text-white/30 flex justify-between" style={{ background: "#111" }}>
          <span>Apostas hoje</span>
          <span className="font-semibold" style={{ color: betBlocked ? "#FF3C00" : "rgba(255,255,255,0.5)" }}>
            {betCreditsUsed} / {MAX_BET_CREDITS} créditos
          </span>
        </div>
        <div className="rounded-lg px-4 py-2 text-xs text-white/30 flex justify-between" style={{ background: "#111" }}>
          <span>Tempo hoje</span>
          <span className="font-semibold" style={{ color: timeBlocked ? "#FF3C00" : "rgba(255,255,255,0.5)" }}>
            {usedMins} / {timeMins} min
          </span>
        </div>
      </div>

      <button
        onClick={() => router.push("/cassino")}
        className="rounded-lg px-8 py-3 text-sm font-semibold text-white"
        style={{ background: "#FF3C00" }}
      >
        Voltar ao cassino
      </button>

      <p className="text-[10px] text-white/20">Os limites reiniciam à meia-noite (horário de Brasília)</p>
    </div>
  );
}
