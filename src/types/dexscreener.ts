/**
 * DexScreener API type definitions
 */

export interface DexScreenerLiquidity {
  usd?: number | string;
  base?: number;
  quote?: number;
}

export interface DexScreenerVolume {
  h24?: number | string;
  h6?: number | string;
  h1?: number | string;
  m5?: number | string;
}

export interface DexScreenerPriceChange {
  m5?: number | string;
  h1?: number | string;
  h6?: number | string;
  h24?: number | string;
}

export interface DexScreenerBaseToken {
  address: string;
  name?: string;
  symbol?: string;
}

export interface DexScreenerQuoteToken {
  address: string;
  name?: string;
  symbol?: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: DexScreenerBaseToken;
  quoteToken: DexScreenerQuoteToken;
  priceNative?: string;
  priceUsd?: string;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume?: DexScreenerVolume;
  priceChange?: DexScreenerPriceChange;
  liquidity?: DexScreenerLiquidity;
  fdv?: number | string;
  marketCap?: number | string;
  pairCreatedAt?: number;
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
}

/**
 * Normalized token metadata from DexScreener
 */
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  liquidity: number;
  volume24h: number;
  volume5m: number;
  volume1h: number;
  priceChange24h: number;
  priceChange5m: number;
  priceChange1h: number;
  pairAddress: string;
  dexId: string;
  url: string;
  createdAt: number | null;
}
