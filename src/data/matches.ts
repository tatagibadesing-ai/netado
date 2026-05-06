export type OddType = 
  | 'home' | 'draw' | 'away' 
  | 'over05' | 'under05' 
  | 'over15' | 'under15' 
  | 'over25' | 'under25' 
  | 'over35' | 'under35' 
  | 'over45' | 'under45' 
  | 'bttsYes' | 'bttsNo' 
  | 'dc1x' | 'dcx2' | 'dc12';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  time: string;
  isFinished: boolean;
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
  };
}

export const initialMatches: Match[] = [];
