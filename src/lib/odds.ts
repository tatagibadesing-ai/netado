import { OddType, Match } from "../data/matches";

// Win condition de cada mercado por placar — fonte única, usada tanto na
// resolução das apostas quanto na precificação das múltiplas.
export const doesPickMatchScore = (oddType: OddType, homeScore: number, awayScore: number): boolean => {
  const total = homeScore + awayScore;

  switch (oddType) {
    case "home": return homeScore > awayScore;
    case "draw": return homeScore === awayScore;
    case "away": return homeScore < awayScore;
    case "over05": return total > 0.5;
    case "under05": return total < 0.5;
    case "over15": return total > 1.5;
    case "under15": return total < 1.5;
    case "over25": return total > 2.5;
    case "under25": return total < 2.5;
    case "over35": return total > 3.5;
    case "under35": return total < 3.5;
    case "over45": return total > 4.5;
    case "under45": return total < 4.5;
    case "bttsYes": return homeScore > 0 && awayScore > 0;
    case "bttsNo": return homeScore === 0 || awayScore === 0;
    case "dc1x": return homeScore >= awayScore;
    case "dcx2": return awayScore >= homeScore;
    case "dc12": return homeScore !== awayScore;
    default: return false;
  }
};

export type MarketGroup = "result" | "totals" | "btts" | "champion";

export const getMarketGroup = (oddType: OddType): MarketGroup => {
  if (["home", "draw", "away", "dc1x", "dcx2", "dc12"].includes(oddType)) return "result";
  if (oddType.startsWith("over") || oddType.startsWith("under")) return "totals";
  if (oddType === "bttsYes" || oddType === "bttsNo") return "btts";
  return "champion";
};

const MAX_GOALS = 10;

// Os palpites podem coexistir? (no máx. um por grupo de mercado e existe ao menos
// um placar em que TODOS vencem). Bloqueia combos contraditórios — ex.: "Mais de
// 2.5" + "Menos de 1.5", que nunca ganham juntos.
export const picksCanCoexist = (oddTypes: OddType[]): boolean => {
  const groups = oddTypes.map(getMarketGroup);
  if (new Set(groups).size !== groups.length) return false;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if (oddTypes.every(t => doesPickMatchScore(t, h, a))) return true;
    }
  }
  return false;
};

// ── Precificação da múltipla pela probabilidade real (Poisson) ──────────────
// Combinar mercados correlacionados da MESMA partida e multiplicar as odds infla
// o prêmio de graça (ex.: 0-0 satisfaz "Menos de 0.5", "Empate" e "Ambas Não" ao
// mesmo tempo). Em vez disso, calculamos a probabilidade CONJUNTA dos palpites a
// partir da distribuição de placares e derivamos uma odd justa.

// Reproduz o avgGoals derivado do 1x2 na API (src/app/api/matches/route.ts).
function reconstructAvgGoals(homeOdd: number, drawOdd: number, awayOdd: number): number {
  const minOdd = Math.min(homeOdd || 2.0, awayOdd || 2.0);
  const safeDraw = drawOdd || 3.2;
  let avgGoals = 2.5;
  if (minOdd < 2.0) {
    avgGoals = 2.5 + (2.0 - minOdd) * 2.0;
  } else {
    avgGoals = 2.5 + (safeDraw - 3.20) * 0.4;
    avgGoals = Math.max(2.0, Math.min(3.0, avgGoals));
  }
  return avgGoals;
}

function poisson(lambda: number, k: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

// Probabilidade de TODOS os palpites de uma partida vencerem juntos, somando a
// massa dos placares que satisfazem todos. Retorna null se não der pra modelar.
function jointProbForMatch(oddTypes: OddType[], match: Match): number | null {
  const { home, draw, away } = match.odds;
  if (!home || !away) return null;

  const avgGoals = reconstructAvgGoals(home, draw, away);
  const hProb = 1 / home;
  const aProb = 1 / away;
  const totalProb = hProb + aProb || 1;
  const lambdaHome = avgGoals * (hProb / totalProb);
  const lambdaAway = avgGoals * (aProb / totalProb);

  const ph: number[] = [];
  const pa: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) {
    ph[k] = poisson(lambdaHome, k);
    pa[k] = poisson(lambdaAway, k);
  }

  let norm = 0;
  let joint = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph[h] * pa[a];
      norm += p;
      if (oddTypes.every(t => doesPickMatchScore(t, h, a))) joint += p;
    }
  }
  if (norm <= 0) return null;
  return joint / norm; // renormaliza pela massa truncada do grid
}

const COMBO_PAYOUT = 0.90; // mesma margem (~10%) do Over/Under na API

export interface SlipPick {
  matchId: string;
  oddType: OddType;
  oddValue: number;
}

// Odd combinada dos palpites de UMA partida.
function matchOdd(items: SlipPick[], match: Match | undefined): number {
  // 1 palpite: usa a odd exibida (idêntica ao botão).
  if (items.length === 1) return items[0].oddValue;

  if (match) {
    const p = jointProbForMatch(items.map(i => i.oddType), match);
    if (p && p > 0) {
      const odd = COMBO_PAYOUT / p;
      return Math.max(1.01, Math.min(100, Number(odd.toFixed(2))));
    }
  }
  // Sem modelo: fallback conservador — nunca paga mais que a perna mais
  // improvável, em vez de multiplicar e inflar.
  return Math.max(...items.map(i => i.oddValue));
}

// Odd total do cupom: combina por partida (probabilidade conjunta) e multiplica
// ENTRE partidas diferentes (aí sim eventos independentes).
export function computeTotalOdds(slip: SlipPick[], matches: Match[]): number {
  const byMatch = new Map<string, SlipPick[]>();
  for (const item of slip) {
    const arr = byMatch.get(item.matchId) ?? [];
    arr.push(item);
    byMatch.set(item.matchId, arr);
  }

  let total = 1;
  for (const items of byMatch.values()) {
    const match = matches.find(m => m.id === items[0].matchId);
    total *= matchOdd(items, match);
  }
  return Number(total.toFixed(2));
}
