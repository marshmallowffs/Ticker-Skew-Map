export type Horizon = '1d' | '1w' | '1m';

export type QuadrantType = 'FEAR' | 'HEDGED RALLY' | 'CONTRARIAN BID' | 'CHASE';

export type UniverseCategory = 'INSTITUTIONAL' | 'SP500' | 'SMALL_MID' | 'ETF' | 'ALL' | 'WATCHLIST';

export interface RadarRecord {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  ret_1d: number;
  ret_1w: number;
  ret_1m: number;
  skew: number; // in percent: (put_25_iv - call_25_iv) / atm_iv * 100
  atm_iv: number; // in percent
  put_25_iv: number; // in percent
  call_25_iv: number; // in percent
  put_25_strike: number;
  call_25_strike: number;
  atm_strike: number;
  dte: number;
  expiration: string;
  volume_25delta: number;
  oi_25delta: number;
  thin: boolean;
  quadrant_1d: QuadrantType;
  quadrant_1w: QuadrantType;
  quadrant_1m: QuadrantType;
  isSP500?: boolean;
  capCategory?: 'sp500' | 'small_mid' | 'etf';
  marketCap?: number; // Market capitalization in billions ($B)
  adv?: number; // 21-day average dollar volume in millions ($M)
  isInstitutional?: boolean; // ADV >= $50M, MCap >= $2B, OI >= 100, Vol >= 20
  catalyst?: string;
  updated_at: string;
}

export interface RadarMetadata {
  total_scanned: number;
  successful_records: number;
  failed_records: number;
  scan_timestamp: string;
  target_horizon: string;
  formula: string;
  description: string;
}

export interface RadarPayload {
  metadata: RadarMetadata;
  records: RadarRecord[];
}
