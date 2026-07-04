import { OddType, Match } from "../data/matches";

// Win condition de cada mercado por placar — fonte única, usada tanto na
// resolução das apostas quanto na precificação das múltiplas.
export const doesPickMatchScore = (oddType: OddType, homeScore: number, awayScore: number): boolean => {
  const total = homeScore + awayScore;
  const diff = homeScore - awayScore;

  // Placar exato ("cs_<casa>_<fora>"): condição paramétrica.
  if (oddType.startsWith("cs_")) {
    const [, h, a] = oddType.split("_");
    return homeScore === Number(h) && awayScore === Number(a);
  }

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
    case "goalsEven": return total % 2 === 0;
    case "goalsOdd": return total % 2 === 1;
    case "mg_h1": return diff === 1;   // casa vence por 1
    case "mg_h2": return diff >= 2;    // casa vence por 2+
    case "mg_a1": return diff === -1;  // fora vence por 1
    case "mg_a2": return diff <= -2;   // fora vence por 2+
    default: return false;
  }
};

// Rótulo legível de um mercado — fonte única usada por cupom, histórico e modais.
export const getOddLabel = (type: OddType): string => {
  if (type.startsWith("cs_")) {
    const [, h, a] = type.split("_");
    return `Placar ${h}-${a}`;
  }
  switch (type) {
    case "home": return "Casa (1)";
    case "draw": return "Empate (X)";
    case "away": return "Fora (2)";
    case "over05": return "Mais de 0.5 Gols";
    case "under05": return "Menos de 0.5 Gols";
    case "over15": return "Mais de 1.5 Gols";
    case "under15": return "Menos de 1.5 Gols";
    case "over25": return "Mais de 2.5 Gols";
    case "under25": return "Menos de 2.5 Gols";
    case "over35": return "Mais de 3.5 Gols";
    case "under35": return "Menos de 3.5 Gols";
    case "over45": return "Mais de 4.5 Gols";
    case "under45": return "Menos de 4.5 Gols";
    case "bttsYes": return "Ambas Marcam: Sim";
    case "bttsNo": return "Ambas Marcam: Não";
    case "dc1x": return "Chance Dupla: 1X";
    case "dcx2": return "Chance Dupla: X2";
    case "dc12": return "Chance Dupla: 12";
    case "goalsEven": return "Total de Gols: Par";
    case "goalsOdd": return "Total de Gols: Ímpar";
    case "mg_h1": return "Casa vence por 1";
    case "mg_h2": return "Casa vence por 2+";
    case "mg_a1": return "Fora vence por 1";
    case "mg_a2": return "Fora vence por 2+";
    case "champion": return "Campeão";
    default: return type;
  }
};

export type MarketGroup = "result" | "totals" | "btts" | "correctScore" | "oddeven" | "margin" | "champion";

export const getMarketGroup = (oddType: OddType): MarketGroup => {
  if (["home", "draw", "away", "dc1x", "dcx2", "dc12"].includes(oddType)) return "result";
  if (oddType.startsWith("over") || oddType.startsWith("under")) return "totals";
  if (oddType === "bttsYes" || oddType === "bttsNo") return "btts";
  if (oddType.startsWith("cs_")) return "correctScore";
  if (oddType === "goalsEven" || oddType === "goalsOdd") return "oddeven";
  if (oddType.startsWith("mg_")) return "margin";
  return "champion";
};

const MAX_GOALS = 10;

// Os palpites podem coexistir? Regras:
// 1) No máx. um por grupo de mercado.
// 2) Nenhum palpite pode ser subconjunto do outro (ex.: cs_0_0 ⊂ draw, under05 ⊂ bttsNo).
//    Se os placares vencedores de A estão todos contidos em B, combinar os dois é
//    redundante e infla a odd de graça — bloqueamos.
// 3) Existe ao menos um placar em que TODOS vencem juntos (não são contraditórios).
export const picksCanCoexist = (oddTypes: OddType[]): boolean => {
  const groups = oddTypes.map(getMarketGroup);
  if (new Set(groups).size !== groups.length) return false;

  // Pré-calcula o conjunto de placares vencedores de cada pick.
  const winSets: boolean[][] = oddTypes.map(t => {
    const wins: boolean[] = [];
    for (let h = 0; h <= MAX_GOALS; h++) {
      for (let a = 0; a <= MAX_GOALS; a++) {
        wins.push(doesPickMatchScore(t, h, a));
      }
    }
    return wins;
  });

  const totalCells = (MAX_GOALS + 1) * (MAX_GOALS + 1);

  // Checa subconjunto: se TODO placar em que A ganha, B também ganha (ou vice-versa),
  // um é redundante do outro — bloqueia.
  for (let i = 0; i < oddTypes.length; i++) {
    for (let j = i + 1; j < oddTypes.length; j++) {
      let iSubJ = true;
      let jSubI = true;
      for (let k = 0; k < totalCells; k++) {
        if (winSets[i][k] && !winSets[j][k]) iSubJ = false;
        if (winSets[j][k] && !winSets[i][k]) jSubI = false;
        if (!iSubJ && !jSubI) break;
      }
      if (iSubJ || jSubI) return false;
    }
  }

  // Existe ao menos um placar que satisfaz TODOS os palpites?
  for (let k = 0; k < totalCells; k++) {
    if (winSets.every(ws => ws[k])) return true;
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

// P(casa), P(empate), P(fora) do modelo dados os lambdas.
function resultProbs(lambdaHome: number, lambdaAway: number): { h: number; d: number; a: number } {
  const ph: number[] = [];
  const pa: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) {
    ph[k] = poisson(lambdaHome, k);
    pa[k] = poisson(lambdaAway, k);
  }
  let h = 0, d = 0, a = 0, norm = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i] * pa[j];
      norm += p;
      if (i > j) h += p; else if (i === j) d += p; else a += p;
    }
  }
  return { h: h / norm, d: d / norm, a: a / norm };
}

// Calibra lambdaHome/lambdaAway para P(casa) e P(fora) do modelo baterem com o
// 1x2 exibido (sem a margem). Sem isso, o modelo coloca a vitória da zebra quase
// toda num placar só (ex.: 0-1) e EXAGERA a correlação com mercados de gols,
// descontando combos legítimos demais (ex.: "Menos de 1.5" + "Fora").
function calibrateLambdas(home: number, draw: number, away: number): { lambdaHome: number; lambdaAway: number } {
  let pH = 1 / home;
  const pD = 1 / draw;
  let pA = 1 / away;
  const s = pH + pD + pA;
  pH /= s; pA /= s; // remove a margem da casa

  const avgGoals = reconstructAvgGoals(home, draw, away);
  const hp = 1 / home, ap = 1 / away, tp = hp + ap || 1;
  let lambdaHome = avgGoals * (hp / tp);
  let lambdaAway = avgGoals * (ap / tp);

  // Coordinate descent: alterna bisseção em cada lambda até casar 1 e 2.
  for (let iter = 0; iter < 24; iter++) {
    let lo = 0.01, hi = 12;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (resultProbs(mid, lambdaAway).h < pH) lo = mid; else hi = mid;
    }
    lambdaHome = (lo + hi) / 2;

    lo = 0.01; hi = 12;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (resultProbs(lambdaHome, mid).a < pA) lo = mid; else hi = mid;
    }
    lambdaAway = (lo + hi) / 2;
  }
  return { lambdaHome, lambdaAway };
}

type ProbFn = (oddTypes: OddType[]) => number;
const modelCache = new Map<string, ProbFn | null>();

// Constrói (e cacheia) a distribuição de placares CALIBRADA da partida e devolve
// uma função que dá a probabilidade de um conjunto de palpites vencer junto.
function buildScoreModel(match: Match): ProbFn | null {
  const { home, draw, away } = match.odds;
  if (!home || !away) return null;

  const key = `${home}|${draw}|${away}`;
  const cached = modelCache.get(key);
  if (cached !== undefined) return cached;

  const { lambdaHome, lambdaAway } = calibrateLambdas(home, draw, away);

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
  if (norm <= 0) { modelCache.set(key, null); return null; }

  if (modelCache.size > 200) modelCache.clear(); // evita crescer sem limite

  const fn: ProbFn = (oddTypes) => {
    let s = 0;
    for (const [h, a, p] of grid) {
      if (oddTypes.every(t => doesPickMatchScore(t, h, a))) s += p;
    }
    return s / norm; // renormaliza pela massa truncada do grid
  };
  modelCache.set(key, fn);
  return fn;
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

// Encontra o palpite de time azarão (time com a maior odd de vitória entre home/away)
// que possui o maior valor de odd no slip (caso haja mais de um).
export function findUnderdogPick(slip: SlipPick[], matches: Match[]): SlipPick | null {
  let bestPick: SlipPick | null = null;
  let maxOdd = 0;

  for (const pick of slip) {
    const match = matches.find(m => m.id === pick.matchId);
    if (!match) continue;

    // É azarão se apostou em Home e odd Home > odd Away, ou se apostou em Away e odd Away > odd Home.
    const isUnderdog =
      (pick.oddType === "home" && match.odds.home > match.odds.away) ||
      (pick.oddType === "away" && match.odds.away > match.odds.home);

    if (isUnderdog && pick.oddValue > maxOdd) {
      maxOdd = pick.oddValue;
      bestPick = pick;
    }
  }

  return bestPick;
}

