import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const now = new Date();
    
    // Hoje
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}${mm}${dd}`;

    // Amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tm_yyyy = tomorrow.getFullYear();
    const tm_mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tm_dd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tm_yyyy}${tm_mm}${tm_dd}`;

    const dateRange = `${todayStr}-${tomorrowStr}`;

    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.copa_do_brasil/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dateRange}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${dateRange}`,
    ];

    const allMatches = [];

    for (const url of urls) {
      try {
        const res = await fetch(url, { next: { revalidate: 60 } });
        const data = await res.json();
        
        const leagueName = data.leagues?.[0]?.abbreviation || data.leagues?.[0]?.name || "Liga";

        if (data.events) {
          for (const event of data.events) {
            const id = event.id;
            const matchDate = new Date(event.date);
            
            // Check if match started more than 4 hours ago (approx 2h after it finished)
            const hoursSinceStart = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
            const isFinished = event.status.type.completed;
            
            // "quero que dps de 2h do jogos ele saia"
            if (isFinished && hoursSinceStart > 4) {
              continue; // Skip this match
            }

            // Exibir data se for amanhã
            const isTomorrow = matchDate.getDate() !== now.getDate();
            const timeStr = matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const displayTime = isTomorrow ? `Amanhã ${timeStr}` : timeStr;
            
            const homeComp = event.competitions[0].competitors.find((c: any) => c.homeAway === "home");
            const awayComp = event.competitions[0].competitors.find((c: any) => c.homeAway === "away");
            
            if (!homeComp || !awayComp) continue;

            const homeTeam = homeComp.team.shortDisplayName || homeComp.team.displayName;
            const awayTeam = awayComp.team.shortDisplayName || awayComp.team.displayName;
            
            const homeLogo = homeComp.team.logo;
            const awayLogo = awayComp.team.logo;
            
            const oddsData = event.competitions[0].odds?.[0];
            
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

            // Generate other odds based on 1x2 to simulate a real sportsbook
            const expectedGoals = 2.5 + (homeOdd < 1.5 ? 0.5 : 0) + (awayOdd < 1.5 ? 0.5 : 0);
            
            const baseO05 = 1.01; const baseU05 = 15.0;
            const baseO15 = 1.25; const baseU15 = 4.0;
            const baseO25 = 1.85; const baseU25 = 1.95;
            const baseO35 = 3.20; const baseU35 = 1.35;
            const baseO45 = 6.50; const baseU45 = 1.10;

            const bttsYes = Number((1.2 + (drawOdd / 4)).toFixed(2));
            const bttsNo = Number((2.0 + (homeOdd > awayOdd ? 0.2 : -0.2)).toFixed(2));
            
            const dc1x = Number((1 / ((1/homeOdd) + (1/drawOdd))).toFixed(2));
            const dcx2 = Number((1 / ((1/awayOdd) + (1/drawOdd))).toFixed(2));
            const dc12 = Number((1 / ((1/homeOdd) + (1/awayOdd))).toFixed(2));

            const homeScore = parseInt(homeComp.score || "0");
            const awayScore = parseInt(awayComp.score || "0");

            allMatches.push({
              id,
              league: leagueName,
              time: isFinished ? "FINALIZADO" : displayTime,
              homeTeam,
              awayTeam,
              homeLogo,
              awayLogo,
              isFinished,
              homeScore,
              awayScore,
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
                dc12
              }
            });
          }
        }
      } catch (err) {
        console.error("Erro ao buscar liga:", url, err);
      }
    }

    return NextResponse.json(allMatches);
  } catch (error) {
    console.error("Erro na API de matches:", error);
    return NextResponse.json({ error: "Falha ao buscar partidas" }, { status: 500 });
  }
}
