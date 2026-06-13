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

  const baseO05 = 1.01; const baseU05 = 15.0;
  const baseO15 = 1.25; const baseU15 = 4.0;
  const baseO25 = 1.85; const baseU25 = 1.95;
  const baseO35 = 3.20; const baseU35 = 1.35;
  const baseO45 = 6.50; const baseU45 = 1.10;

  const bttsYes = Number((1.2 + (drawOdd / 4)).toFixed(2));
  const bttsNo = Number((2.0 + (homeOdd > awayOdd ? 0.2 : -0.2)).toFixed(2));

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
      over05: baseO05,
      under05: baseU05,
      over15: baseO15,
      under15: baseU15,
      over25: baseO25,
      under25: baseU25,
      over35: baseO35,
      under35: baseU35,
      over45: baseO45,
      under45: baseU45,
      bttsYes,
      bttsNo,
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
