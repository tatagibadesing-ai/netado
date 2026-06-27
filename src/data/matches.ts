// Placar exato: o oddType carrega o próprio placar (ex.: "cs_2_1" = 2 a 1).
// Resolvido genericamente em doesPickMatchScore, sem precisar listar cada caso.
export type CorrectScoreOdd = `cs_${number}_${number}`;

export type OddType =
  | 'home' | 'draw' | 'away'
  | 'over05' | 'under05'
  | 'over15' | 'under15'
  | 'over25' | 'under25'
  | 'over35' | 'under35'
  | 'over45' | 'under45'
  | 'bttsYes' | 'bttsNo'
  | 'dc1x' | 'dcx2' | 'dc12' | 'champion'
  | 'goalsEven' | 'goalsOdd'                       // total de gols par / ímpar
  | 'mg_h1' | 'mg_h2' | 'mg_a1' | 'mg_a2'          // margem de vitória (casa/fora por 1 / por 2+)
  | CorrectScoreOdd;                               // placar exato

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  time: string;
  isFinished: boolean;
  isLive?: boolean;
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw: number;
    away: number;
    over05: number;
    under05: number;
    over15: number;
    under15: number;
    over25: number;
    under25: number;
    over35: number;
    under35: number;
    over45: number;
    under45: number;
    bttsYes: number;
    bttsNo: number;
    dc1x: number;
    dcx2: number;
    dc12: number;
    // Mercados adicionais derivados (opcionais — partidas antigas podem não tê-los).
    goalsEven?: number;
    goalsOdd?: number;
    mg_h1?: number;
    mg_h2?: number;
    mg_a1?: number;
    mg_a2?: number;
    // Placar exato: chaves "cs_<casa>_<fora>" -> odd.
    [score: `cs_${number}_${number}`]: number | undefined;
  };
}

export const initialMatches: Match[] = [];
