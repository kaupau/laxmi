import fs from 'fs';
import type {
  PaperTradingData,
  Portfolio,
  BuyResult,
  SellResult,
  ExtendedStats,
  Trade,
  BuyTrade,
  SellTrade,
} from './types/paper-trading.js';

/**
 * PaperTrading - Simulates trading without real money
 *
 * Tracks virtual portfolio, trades, and performance with full type safety.
 */
export class PaperTrading {
  private readonly dataFile: string;
  private data: PaperTradingData;

  /**
   * Initialize paper trading system
   * @param dataFile - Path to JSON file for persisting data
   */
  constructor(dataFile: string = './paper-trades.json') {
    this.dataFile = dataFile;
    this.data = this.loadData();
  }

  /**
   * Load paper trading data from file
   */
  private loadData(): PaperTradingData {
    try {
      if (fs.existsSync(this.dataFile)) {
        const content = fs.readFileSync(this.dataFile, 'utf8');
        return JSON.parse(content) as PaperTradingData;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading paper trading data:', errorMessage);
    }

    // Default initial state
    return {
      enabled: false,
      balance: 1.0, // Start with 1 SOL
      tokens: {}, // { mintAddress: { symbol, amount, avgPrice, totalCost } }
      trades: [], // History of all trades
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        startingBalance: 1.0,
      },
    };
  }

  /**
   * Save data to file
   */
  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving paper trading data:', errorMessage);
    }
  }

  /**
   * Toggle paper trading mode on/off
   * @returns New enabled state
   */
  public toggle(): boolean {
    this.data.enabled = !this.data.enabled;
    this.saveData();
    return this.data.enabled;
  }

  /**
   * Check if paper trading is enabled
   */
  public isEnabled(): boolean {
    return this.data.enabled;
  }

  /**
   * Get current portfolio
   */
  public getPortfolio(): Portfolio {
    return {
      balance: this.data.balance,
      tokens: this.data.tokens,
      stats: this.data.stats,
      totalValue: this.calculateTotalValue(),
    };
  }

  /**
   * Calculate total portfolio value (requires current prices)
   * @param tokenPrices - Optional map of token mint addresses to current prices
   */
  public calculateTotalValue(tokenPrices: Record<string, number> = {}): number {
    let totalValue = this.data.balance; // Start with SOL balance

    // Add value of all token holdings
    for (const [mint, holding] of Object.entries(this.data.tokens)) {
      const currentPrice = tokenPrices[mint] ?? holding.avgPrice;
      totalValue += holding.amount * currentPrice;
    }

    return totalValue;
  }

  /**
   * Execute a paper buy
   * @param tokenMint - Token mint address
   * @param symbol - Token symbol
   * @param amountSOL - Amount of SOL to spend
   * @param pricePerToken - Current price per token in SOL
   */
  public async buy(
    tokenMint: string,
    symbol: string,
    amountSOL: number,
    pricePerToken: number
  ): Promise<BuyResult> {
    if (!this.data.enabled) {
      throw new Error('Paper trading is not enabled');
    }

    if (amountSOL > this.data.balance) {
      throw new Error(
        `Insufficient balance. Have ${this.data.balance} SOL, need ${amountSOL} SOL`
      );
    }

    // Calculate how many tokens we get
    const tokensReceived = amountSOL / pricePerToken;

    // Deduct SOL from balance
    this.data.balance -= amountSOL;

    // Add or update token holding
    const existingHolding = this.data.tokens[tokenMint];
    if (existingHolding) {
      const totalAmount = existingHolding.amount + tokensReceived;
      const totalCost = existingHolding.totalCost + amountSOL;
      existingHolding.avgPrice = totalCost / totalAmount;
      existingHolding.amount = totalAmount;
      existingHolding.totalCost = totalCost;
    } else {
      this.data.tokens[tokenMint] = {
        symbol,
        amount: tokensReceived,
        avgPrice: pricePerToken,
        totalCost: amountSOL,
        firstBought: new Date().toISOString(),
      };
    }

    // Record trade
    const trade: BuyTrade = {
      type: 'BUY',
      tokenMint,
      symbol,
      amountSOL,
      tokensReceived,
      pricePerToken,
      timestamp: new Date().toISOString(),
      balanceAfter: this.data.balance,
    };

    this.data.trades.push(trade);
    this.data.stats.totalTrades++;

    this.saveData();

    return {
      success: true,
      trade,
      portfolio: this.getPortfolio(),
    };
  }

  /**
   * Execute a paper sell
   * @param tokenMint - Token mint address
   * @param tokenAmount - Amount of tokens to sell
   * @param pricePerToken - Current price per token in SOL
   */
  public async sell(
    tokenMint: string,
    tokenAmount: number,
    pricePerToken: number
  ): Promise<SellResult> {
    if (!this.data.enabled) {
      throw new Error('Paper trading is not enabled');
    }

    const holding = this.data.tokens[tokenMint];
    if (!holding) {
      throw new Error(`No holdings for token ${tokenMint}`);
    }

    if (tokenAmount > holding.amount) {
      throw new Error(
        `Insufficient tokens. Have ${holding.amount}, trying to sell ${tokenAmount}`
      );
    }

    // Calculate SOL received
    const solReceived = tokenAmount * pricePerToken;

    // Calculate profit/loss for this portion
    const costBasis = (holding.totalCost / holding.amount) * tokenAmount;
    const profit = solReceived - costBasis;

    // Update balance
    this.data.balance += solReceived;

    // Update or remove token holding
    if (tokenAmount >= holding.amount) {
      // Selling all
      delete this.data.tokens[tokenMint];
    } else {
      // Selling partial
      const remainingAmount = holding.amount - tokenAmount;
      const remainingCost = holding.totalCost - costBasis;
      holding.amount = remainingAmount;
      holding.totalCost = remainingCost;
      holding.avgPrice = remainingCost / remainingAmount;
    }

    // Record trade
    const trade: SellTrade = {
      type: 'SELL',
      tokenMint,
      symbol: holding.symbol,
      tokenAmount,
      solReceived,
      pricePerToken,
      profit,
      profitPercent: (profit / costBasis) * 100,
      timestamp: new Date().toISOString(),
      balanceAfter: this.data.balance,
    };

    this.data.trades.push(trade);
    this.data.stats.totalTrades++;
    this.data.stats.totalProfit += profit;

    if (profit > 0) {
      this.data.stats.wins++;
    } else if (profit < 0) {
      this.data.stats.losses++;
    }

    this.saveData();

    return {
      success: true,
      trade,
      portfolio: this.getPortfolio(),
    };
  }

  /**
   * Get trade history
   * @param limit - Maximum number of trades to return
   */
  public getHistory(limit: number = 10): Trade[] {
    return this.data.trades.slice(-limit).reverse();
  }

  /**
   * Get performance stats
   */
  public getStats(): ExtendedStats {
    const portfolio = this.getPortfolio();
    const stats = this.data.stats;

    const totalReturn = portfolio.totalValue - stats.startingBalance;
    const returnPercent = (totalReturn / stats.startingBalance) * 100;

    const winRate =
      stats.totalTrades > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0;

    return {
      ...stats,
      currentValue: portfolio.totalValue,
      totalReturn,
      returnPercent,
      winRate,
      avgProfitPerTrade: stats.totalTrades > 0 ? stats.totalProfit / stats.totalTrades : 0,
    };
  }

  /**
   * Reset paper trading to initial state
   * @param initialBalance - Starting balance in SOL
   */
  public reset(initialBalance: number = 1.0): Portfolio {
    this.data = {
      enabled: this.data.enabled, // Preserve enabled state
      balance: initialBalance,
      tokens: {},
      trades: [],
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        startingBalance: initialBalance,
      },
    };
    this.saveData();
    return this.getPortfolio();
  }
}

export default PaperTrading;
