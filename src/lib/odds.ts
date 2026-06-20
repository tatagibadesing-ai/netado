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

// Constrói a distribuição de placares da partida (Poisson independente por time,
// com as taxas reconstruídas do 1x2) e devolve uma função que dá a probabilidade
// de um conjunto de palpites vencer. Retorna null se não der pra modelar.
function buildScoreModel(match: Match): ((oddTypes: OddType[]) => number) | null {
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
  const grid: Array<[number, number, number]> = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = ph[h] * pa[a];
      norm += p;
      grid.push([h, a, p]);
    }
  }
  if (norm <= 0) return null;

  return (oddTypes: OddType[]) => {
    let s = 0;
    for (const [h, a, p] of grid) {
      if (oddTypes.every(t => doesPickMatchScore(t, h, a))) s += p;
    }
    return s / norm; // renormaliza pela massa truncada do grid
  };
}

export interface SlipPick {
  matchId: string;
  oddType: OddType;
  oddValue: number;
}

// Odd combinada dos palpites de UMA partida.
//
// Ancoramos no PRODUTO das odds exibidas (que já carregam a margem da casa) e
// só descontamos a CORRELAÇÃO entre os mercados: R = P(conjunta) / P(produto das
// marginais). Para eventos independentes R≈1 (mantém o produto); para mercados
// positivamente correlacionados — o exploit, ex.: 0-0 satisfaz "Menos de 0.5",
// "Empate" e "Ambas Não" — R fica grande e derruba a odd para perto da realidade.
function matchOdd(items: SlipPick[], match: Match | undefined): number {
  // 1 palpite: usa a odd exibida (idêntica ao botão).
  if (items.length === 1) return items[0].oddValue;

  const productOdd = items.reduce((acc, i) => acc * i.oddValue, 1);
  const maxLegOdd = Math.max(...items.map(i => i.oddValue));

  const prob = match ? buildScoreModel(match) : null;
  if (prob) {
    const types = items.map(i => i.oddType);
    const qJoint = prob(types);
    const qIndep = types.reduce((acc, t) => acc * prob([t]), 1);
    if (qJoint > 0 && qIndep > 0) {
      const correlation = qJoint / qIndep; // >1 = positivamente correlacionado
      const corrected = productOdd / correlation;
      // Limites de sanidade:
      //  • nunca MENOR que a perna mais cara — juntar mais condições só pode
      //    deixar mais difícil de ganhar (senão juntar palpites pioraria a odd);
      //  • nunca MAIOR que o produto — correlação só reduz, jamais infla.
      const odd = Math.min(productOdd, Math.max(maxLegOdd, corrected));
      return Number(odd.toFixed(2));
    }
  }
  // Sem modelo: fallback conservador (perna mais cara), nunca o produto inflado.
  return Number(maxLegOdd.toFixed(2));
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
