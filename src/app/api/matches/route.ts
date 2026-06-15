import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function americanToDecimal(americanStr: string | number | undefined): number {
  if (!americanStr) return 0;
  let val = typeof americanStr === 'string' ? parseFloat(americanStr.replace("+", "")) : americanStr;
  if (isNaN(val)) return 0;
  if (val > 0) {
    return (val / 100) + 1;
  } else if (val < 0) {
    return (100 / Math.abs(val)) + 1;
  }
  return 1.0;
}

// Traduz os placeholders de confronto do mata-mata da Copa (ex.: "RD16 W1",
// "QF W2", "SF L1") para rótulos legíveis em português.
function prettyTeam(name: string): string {
  if (!name) return name;
  const m = name.match(/^(RD32|RD16|QF|SF|3RD|F)\s*([WL])?(\d+)?$/i);
  if (!m) return name;
  const stage: Record<string, string> = {
    RD32: "32-avos", RD16: "Oitavas", QF: "Quartas", SF: "Semi", "3RD": "3º Lugar", F: "Final",
  };
  const stageLabel = stage[m[1].toUpperCase()] || m[1];
  const outcome = m[2] ? (m[2].toUpperCase() === "W" ? "Venc." : "Perd.") : "";
  const num = m[3] ? ` ${m[3]}` : "";
  return `${outcome} ${stageLabel}${num}`.trim();
}


// Calcula a média de gols esperada (avgGoals) de uma partida com base nas odds de vitória (1X2)
function getAvgGoals(homeOdd: number, drawOdd: number, awayOdd: number): number {
  const minOdd = Math.min(homeOdd || 2.0, awayOdd || 2.0);
  const safeDraw = drawOdd || 3.2;
  
  let avgGoals = 2.5;
  if (minOdd < 2.0) {
    // Se há um grande favorito, a média esperada de gols aumenta significativamente (fator 2.0x)
    avgGoals = 2.5 + (2.0 - minOdd) * 2.0;
  } else {
    // Para jogos equilibrados, ajusta conforme a odd do empate (quanto menor a odd do empate, mais truncado o jogo)
    avgGoals = 2.5 + (safeDraw - 3.20) * 0.4;
    avgGoals = Math.max(2.0, Math.min(3.0, avgGoals));
  }
  return avgGoals;
}

// Calcula odds de Over/Under usando Distribuição de Poisson
function calculateOverUnderOdds(avgGoals: number) {
  const lambda = avgGoals;
  const p0 = Math.exp(-lambda);
  const p1 = p0 * lambda;
  const p2 = (p1 * lambda) / 2;
  const p3 = (p2 * lambda) / 3;
  const p4 = (p3 * lambda) / 4;
  
  const pUnder05 = p0;
  const pUnder15 = p0 + p1;
  const pUnder25 = p0 + p1 + p2;
  const pUnder35 = p0 + p1 + p2 + p3;
  const pUnder45 = p0 + p1 + p2 + p3 + p4;
  
  const pOver05 = 1 - pUnder05;
  const pOver15 = 1 - pUnder15;
  const pOver25 = 1 - pUnder25;
  const pOver35 = 1 - pUnder35;
  const pOver45 = 1 - pUnder45;
  
  // Margem de lucro da casa de apostas (payout de 90%)
  const payout = 0.90;
  
  const formatOdd = (prob: number): number => {
    if (prob <= 0) return 100.0;
    const odd = payout / prob;
    return Number(Math.max(1.01, Math.min(100.0, odd)).toFixed(2));
  };
  
  return {
    over05: formatOdd(pOver05),
    under05: formatOdd(pUnder05),
    over15: formatOdd(pOver15),
    under15: formatOdd(pUnder15),
    over25: formatOdd(pOver25),
    under25: formatOdd(pUnder25),
    over35: formatOdd(pOver35),
    under35: formatOdd(pUnder35),
    over45: formatOdd(pOver45),
    under45: formatOdd(pUnder45),
  };
}

// Calcula odds de Ambas Equipes Marcam (BTTS) baseadas no favoritismo e média de gols via Poisson
function calculateBttsOdds(homeOdd: number, drawOdd: number, awayOdd: number, avgGoals: number) {
  const hProb = 1 / (homeOdd || 2.0);
  const aProb = 1 / (awayOdd || 2.0);
  const totalProb = hProb + aProb;
  
  // Fração de gols esperados de cada equipe baseada em força relativa
  const favShare = hProb > aProb ? (hProb / totalProb) : (aProb / totalProb);
  const undShare = 1 - favShare;
  
  const lambdaFav = avgGoals * favShare;
  const lambdaUnd = avgGoals * undShare;
  
  const pFavZero = Math.exp(-lambdaFav);
  const pUndZero = Math.exp(-lambdaUnd);
  
  // Ambas marcam = (Fav faz >=1 gol) E (Und faz >=1 gol)
  const pBttsYes = (1 - pFavZero) * (1 - pUndZero);
  const pBttsNo = 1 - pBttsYes;
  
  const payout = 0.93; // Payout ligeiramente maior para BTTS para manter competitividade
  
  let bttsYes = pBttsYes > 0 ? (payout / pBttsYes) : 100.0;
  let bttsNo = pBttsNo > 0 ? (payout / pBttsNo) : 100.0;
  
  // Suavização para BTTS No quando é extremamente baixo (como em favoritos absolutos)
  if (bttsNo < 1.30) {
    bttsNo = 1.30 - (1.30 - bttsNo) * 0.6;
  }
  
  bttsYes = Math.max(1.01, Math.min(100.0, bttsYes));
  bttsNo = Math.max(1.01, Math.min(100.0, bttsNo));
  
  return {
    yes: Number(bttsYes.toFixed(2)),
    no: Number(bttsNo.toFixed(2)),
  };
}

// Constrói o objeto de partida a partir de um evento da ESPN, derivando os
// mercados adicionais a partir do 1x2 para simular uma casa de apostas real.
function buildMatchFromEvent(event: any, leagueName: string, now: Date, spNow: Date) {
  const id = event.id;
  const matchDate = new Date(event.date);
  const isFinished = event.status.type.completed;
  const isLive = event.status.type.state === "in";

  const competition = event.competitions[0];
  const homeComp = competition.competitors.find((c: any) => c.homeAway === "home");
  const awayComp = competition.competitors.find((c: any) => c.homeAway === "away");
  if (!homeComp || !awayComp) return null;

  // Formata o horário: hoje -> "HH:MM", amanhã -> "Amanhã HH:MM",
  // demais dias -> "DD/MM HH:MM".
  const spMatchDate = new Date(matchDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const timeStr = matchDate.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const dayDiff = Math.floor((spMatchDate.setHours(0, 0, 0, 0) - new Date(spNow).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  let displayTime = timeStr;
  if (isLive) {
    let detail = event.status.type.detail || "AO VIVO";
    detail = detail
      .replace("1st Half", "1º Tempo")
      .replace("2nd Half", "2º Tempo")
      .replace("Halftime", "Intervalo");
    displayTime = detail;
  } else if (dayDiff === 1) {
    displayTime = `Amanhã ${timeStr}`;
  } else if (dayDiff !== 0) {
    const dateLabel = matchDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
    displayTime = `${dateLabel} ${timeStr}`;
  }

  const homeTeam = prettyTeam(homeComp.team.shortDisplayName || homeComp.team.displayName);
  const awayTeam = prettyTeam(awayComp.team.shortDisplayName || awayComp.team.displayName);
  const homeLogo = homeComp.team.logo;
  const awayLogo = awayComp.team.logo;

  const oddsData = competition.odds?.[0];

  let homeOdd = 2.10;
  let drawOdd = 3.20;
  let awayOdd = 3.60;

  if (oddsData?.moneyline) {
    const hA = oddsData.moneyline.home?.close?.odds || oddsData.moneyline.home?.open?.odds;
    const dA = oddsData.moneyline.draw?.close?.odds || oddsData.moneyline.draw?.open?.odds;
    const aA = oddsData.moneyline.away?.close?.odds || oddsData.moneyline.away?.open?.odds;

    if (hA) homeOdd = americanToDecimal(hA);
    if (dA) drawOdd = americanToDecimal(dA);
    if (aA) awayOdd = americanToDecimal(aA);
  } else if (oddsData?.drawOdds) {
    drawOdd = americanToDecimal(oddsData.drawOdds.moneyLine) || 3.20;
  }

  const avgGoals = getAvgGoals(homeOdd, drawOdd, awayOdd);
  const oOdds = calculateOverUnderOdds(avgGoals);
  const bttsOdds = calculateBttsOdds(homeOdd, drawOdd, awayOdd, avgGoals);

  const dc1x = Number((1 / ((1 / homeOdd) + (1 / drawOdd))).toFixed(2));
  const dcx2 = Number((1 / ((1 / awayOdd) + (1 / drawOdd))).toFixed(2));
  const dc12 = Number((1 / ((1 / homeOdd) + (1 / awayOdd))).toFixed(2));

  const homeScore = parseInt(homeComp.score || "0");
  const awayScore = parseInt(awayComp.score || "0");

  return {
    id,
    league: leagueName,
    time: isFinished ? "FINALIZADO" : displayTime,
    homeTeam,
    awayTeam,
    homeLogo,
    awayLogo,
    isFinished,
    isLive,
    homeScore,
    awayScore,
    _date: matchDate.getTime(),
    odds: {
      home: homeOdd,
      draw: drawOdd,
      away: awayOdd,
      over05: oOdds.over05,
      under05: oOdds.under05,
      over15: oOdds.over15,
      under15: oOdds.under15,
      over25: oOdds.over25,
      under25: oOdds.under25,
      over35: oOdds.over35,
      under35: oOdds.under35,
      over45: oOdds.over45,
      under45: oOdds.under45,
      bttsYes: bttsOdds.yes,
      bttsNo: bttsOdds.no,
      dc1x,
      dcx2,
      dc12,
    },
  };
}


export async function GET() {
  try {
    const now = new Date();
    const spNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    // Ontem (para resolver apostas pendentes de jogos já finalizados)
    const spYesterday = new Date(spNow);
    spYesterday.setDate(spYesterday.getDate() - 1);
    const yd_yyyy = spYesterday.getFullYear();
    const yd_mm = String(spYesterday.getMonth() + 1).padStart(2, '0');
    const yd_dd = String(spYesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yd_yyyy}${yd_mm}${yd_dd}`;

    // Amanhã
    const spTomorrow = new Date(spNow);
    spTomorrow.setDate(spTomorrow.getDate() + 1);
    const tm_yyyy = spTomorrow.getFullYear();
    const tm_mm = String(spTomorrow.getMonth() + 1).padStart(2, '0');
    const tm_dd = String(spTomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tm_yyyy}${tm_mm}${tm_dd}`;

    const dateRange = `${yesterdayStr}-${tomorrowStr}`;

    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.copa_do_brasil/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${dateRange}`,
    ];

    const LEAGUE_NAME_MAP: Record<string, string> = {
      "bra.1": "Brasileirão Série A",
      "bra.copa_do_brasil": "Copa do Brasil",
      "conmebol.libertadores": "CONMEBOL Libertadores",
      "conmebol.sudamericana": "CONMEBOL Sudamericana",
      "uefa.champions": "UEFA Champions League",
      "eng.1": "Premier League",
      "esp.1": "LaLiga",
    };

    const allMatches: any[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        const slug = data.leagues?.[0]?.slug as string | undefined;
        const leagueName = (slug && LEAGUE_NAME_MAP[slug]) || data.leagues?.[0]?.abbreviation || data.leagues?.[0]?.name || "Liga";

        if (data.events) {
          for (const event of data.events) {
            const matchDate = new Date(event.date);
            const hoursSinceStart = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
            const isFinished = event.status.type.completed;

            // Manter jogos finalizados por 24h para garantir resolução de apostas pendentes
            if (isFinished && hoursSinceStart > 24) continue;

            const match = buildMatchFromEvent(event, leagueName, now, spNow);
            if (match) allMatches.push(match);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar liga:", url, err);
      }
    }

    // ── Copa do Mundo 2026 ─────────────────────────────────────────────
    // Busca o torneio inteiro (todas as partidas e odds), independente da
    // janela de datas usada para as ligas regulares. limit=300 garante as
    // 104 partidas (o padrão da API corta em 100).
    try {
      const wcUrl =
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260731&limit=300`;
      const res = await fetch(wcUrl, { cache: "no-store" });
      const data = await res.json();
      const wcMatches: any[] = [];
      if (data.events) {
        for (const event of data.events) {
          const matchDate = new Date(event.date);
          const isFinished = event.status.type.completed;

          // Manter jogos finalizados até 1 dia atrás (hoje e ontem no horário de Brasília)
          const spMatchDate = new Date(matchDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
          const dayDiff = Math.floor((spMatchDate.setHours(0, 0, 0, 0) - new Date(spNow).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
          if (isFinished && dayDiff < -1) continue;

          const match = buildMatchFromEvent(event, "Copa do Mundo", now, spNow);
          if (match) wcMatches.push(match);
        }
      }
      // Jogos a disputar primeiro (data crescente), finalizados por último.
      wcMatches.sort((a, b) => {
        if (a.isFinished !== b.isFinished) return a.isFinished ? 1 : -1;
        return a.isFinished ? b._date - a._date : a._date - b._date;
      });
      allMatches.unshift(...wcMatches);
    } catch (err) {
      console.error("Erro ao buscar Copa do Mundo:", err);
    }

    // Remove o campo auxiliar de ordenação antes de responder.
    for (const m of allMatches) delete m._date;

    return NextResponse.json(allMatches);
  } catch (error) {
    console.error("Erro na API de matches:", error);
    return NextResponse.json({ error: "Falha ao buscar partidas" }, { status: 500 });
  }
}
