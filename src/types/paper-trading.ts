/**
 * Paper trading type definitions
 */

/**
 * Token holding in paper trading portfolio
 */
export interface TokenHolding {
  symbol: string;
  amount: number;
  avgPrice: number;
  totalCost: number;
  firstBought: string;
}

/**
 * Paper trading statistics
 */
export interface PaperTradingStats {
  totalTrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  startingBalance: number;
}

/**
 * Extended statistics with calculated fields
 */
export interface ExtendedStats extends PaperTradingStats {
  currentValue: number;
  totalReturn: number;
  returnPercent: number;
  winRate: number;
  avgProfitPerTrade: number;
}

/**
 * Token holdings map (mint address -> holding)
 */
export interface TokenHoldings {
  [mintAddress: string]: TokenHolding;
}

/**
 * Buy trade record
 */
export interface BuyTrade {
  type: 'BUY';
  tokenMint: string;
  symbol: string;
  amountSOL: number;
  tokensReceived: number;
  pricePerToken: number;
  timestamp: string;
  balanceAfter: number;
}

/**
 * Sell trade record
 */
export interface SellTrade {
  type: 'SELL';
  tokenMint: string;
  symbol: string;
  tokenAmount: number;
  solReceived: number;
  pricePerToken: number;
  profit: number;
  profitPercent: number;
  timestamp: string;
  balanceAfter: number;
}

/**
 * Trade record (buy or sell)
 */
export type Trade = BuyTrade | SellTrade;

/**
 * Paper trading data structure
 */
export interface PaperTradingData {
  enabled: boolean;
  balance: number;
  tokens: TokenHoldings;
  trades: Trade[];
  stats: PaperTradingStats;
}

/**
 * Portfolio information
 */
export interface Portfolio {
  balance: number;
  tokens: TokenHoldings;
  stats: PaperTradingStats;
  totalValue: number;
}

/**
 * Buy result
 */
export interface BuyResult {
  success: boolean;
  trade: BuyTrade;
  portfolio: Portfolio;
}

/**
 * Sell result
 */
export interface SellResult {
  success: boolean;
  trade: SellTrade;
  portfolio: Portfolio;
}
