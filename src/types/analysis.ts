/**
 * Token analysis type definitions
 */

/**
 * Volume trend analysis result
 */
export interface VolumeTrend {
  volume5m: number;
  volume1h: number;
  volume24h: number;
  recentVsHourMultiplier: number;
  recentVsDayMultiplier: number;
  momentum: 'high' | 'medium' | 'low';
  isHeatingUp: boolean;
}

/**
 * Whale holding information
 */
export interface WhaleHolding {
  name: string;
  emoji: string;
  address: string;
  balance: number;
}

/**
 * Holder statistics
 */
export interface HolderStats {
  holderCount: number;
}

/**
 * Token age information
 */
export interface TokenAge {
  hours: number | null;
  isNew: boolean;
}

/**
 * Market data for a token
 */
export interface MarketData {
  marketCap: number;
  marketCapFormatted: string;
  inTargetRange: boolean;
  targetRange: string;
  price: number;
  liquidity: number;
  liquidityFormatted: string;
}

/**
 * Price action data
 */
export interface PriceAction {
  change24h: number;
  change1h: number;
  change5m: number;
}

/**
 * Whale activity summary
 */
export interface WhaleActivity {
  otherWhalesHolding: WhaleHolding[];
  whaleCount: number;
}

/**
 * DEX information
 */
export interface DexInfo {
  name: string;
  pairAddress: string;
}

/**
 * Token basic info
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  url: string;
}

/**
 * Complete token analysis result
 */
export interface TokenAnalysis {
  success: boolean;
  reason?: string;
  token?: TokenInfo;
  marketData?: MarketData;
  volumeAnalysis?: VolumeTrend | null;
  priceAction?: PriceAction;
  whaleActivity?: WhaleActivity;
  tokenAge?: TokenAge;
  dex?: DexInfo;
  scoring?: TokenScoring;
}

/**
 * Token scoring result
 */
export interface TokenScoring {
  score: number;
  signals: string[];
  recommendation: 'BUY' | 'WATCH' | 'SKIP';
}
