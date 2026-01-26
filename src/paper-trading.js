import fs from 'fs';
import path from 'path';

/**
 * PaperTrading - Simulates trading without real money
 *
 * Tracks virtual portfolio, trades, and performance
 */
export class PaperTrading {
  constructor(dataFile = './paper-trades.json') {
    this.dataFile = dataFile;
    this.data = this.loadData();
  }

  /**
   * Load paper trading data from file
   */
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const content = fs.readFileSync(this.dataFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading paper trading data:', error.message);
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
        startingBalance: 1.0
      }
    };
  }

  /**
   * Save data to file
   */
  saveData() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving paper trading data:', error.message);
    }
  }

  /**
   * Toggle paper trading mode on/off
   */
  toggle() {
    this.data.enabled = !this.data.enabled;
    this.saveData();
    return this.data.enabled;
  }

  /**
   * Check if paper trading is enabled
   */
  isEnabled() {
    return this.data.enabled;
  }

  /**
   * Get current portfolio
   */
  getPortfolio() {
    return {
      balance: this.data.balance,
      tokens: this.data.tokens,
      stats: this.data.stats,
      totalValue: this.calculateTotalValue()
    };
  }

  /**
   * Calculate total portfolio value (requires current prices)
   */
  calculateTotalValue(tokenPrices = {}) {
    let totalValue = this.data.balance; // Start with SOL balance

    // Add value of all token holdings
    for (const [mint, holding] of Object.entries(this.data.tokens)) {
      const currentPrice = tokenPrices[mint] || holding.avgPrice;
      totalValue += holding.amount * currentPrice;
    }

    return totalValue;
  }

  /**
   * Execute a paper buy
   */
  async buy(tokenMint, symbol, amountSOL, pricePerToken) {
    if (!this.data.enabled) {
      throw new Error('Paper trading is not enabled');
    }

    if (amountSOL > this.data.balance) {
      throw new Error(`Insufficient balance. Have ${this.data.balance} SOL, need ${amountSOL} SOL`);
    }

    // Calculate how many tokens we get
    const tokensReceived = amountSOL / pricePerToken;

    // Deduct SOL from balance
    this.data.balance -= amountSOL;

    // Add or update token holding
    if (this.data.tokens[tokenMint]) {
      const holding = this.data.tokens[tokenMint];
      const totalAmount = holding.amount + tokensReceived;
      const totalCost = holding.totalCost + amountSOL;
      holding.avgPrice = totalCost / totalAmount;
      holding.amount = totalAmount;
      holding.totalCost = totalCost;
    } else {
      this.data.tokens[tokenMint] = {
        symbol,
        amount: tokensReceived,
        avgPrice: pricePerToken,
        totalCost: amountSOL,
        firstBought: new Date().toISOString()
      };
    }

    // Record trade
    const trade = {
      type: 'BUY',
      tokenMint,
      symbol,
      amountSOL,
      tokensReceived,
      pricePerToken,
      timestamp: new Date().toISOString(),
      balanceAfter: this.data.balance
    };

    this.data.trades.push(trade);
    this.data.stats.totalTrades++;

    this.saveData();

    return {
      success: true,
      trade,
      portfolio: this.getPortfolio()
    };
  }

  /**
   * Execute a paper sell
   */
  async sell(tokenMint, tokenAmount, pricePerToken) {
    if (!this.data.enabled) {
      throw new Error('Paper trading is not enabled');
    }

    const holding = this.data.tokens[tokenMint];
    if (!holding) {
      throw new Error(`No holdings for token ${tokenMint}`);
    }

    if (tokenAmount > holding.amount) {
      throw new Error(`Insufficient tokens. Have ${holding.amount}, trying to sell ${tokenAmount}`);
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
    const trade = {
      type: 'SELL',
      tokenMint,
      symbol: holding.symbol,
      tokenAmount,
      solReceived,
      pricePerToken,
      profit,
      profitPercent: (profit / costBasis) * 100,
      timestamp: new Date().toISOString(),
      balanceAfter: this.data.balance
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
      portfolio: this.getPortfolio()
    };
  }

  /**
   * Get trade history
   */
  getHistory(limit = 10) {
    return this.data.trades.slice(-limit).reverse();
  }

  /**
   * Get performance stats
   */
  getStats() {
    const portfolio = this.getPortfolio();
    const stats = this.data.stats;

    const totalReturn = portfolio.totalValue - stats.startingBalance;
    const returnPercent = (totalReturn / stats.startingBalance) * 100;

    const winRate = stats.totalTrades > 0
      ? (stats.wins / (stats.wins + stats.losses)) * 100
      : 0;

    return {
      ...stats,
      currentValue: portfolio.totalValue,
      totalReturn,
      returnPercent,
      winRate,
      avgProfitPerTrade: stats.totalTrades > 0 ? stats.totalProfit / stats.totalTrades : 0
    };
  }

  /**
   * Reset paper trading to initial state
   */
  reset(initialBalance = 1.0) {
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
        startingBalance: initialBalance
      }
    };
    this.saveData();
    return this.getPortfolio();
  }
}

export default PaperTrading;
