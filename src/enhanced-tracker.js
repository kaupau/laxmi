/**
 * Enhanced Wallet Tracker with Pigeon Integration
 *
 * This extends the base WalletTracker with Pigeon API capabilities:
 * - Full token portfolio tracking (not just SOL)
 * - PnL calculations
 * - Whale detection
 * - Market intelligence
 * - Trading automation
 */

import { WalletTracker } from './tracker.js';
import { PigeonClient } from './pigeon-client.js';

export class EnhancedWalletTracker extends WalletTracker {
  constructor(rpcUrl, pigeonApiKey, options = {}) {
    super(rpcUrl);

    // Initialize Pigeon client if API key provided
    this.pigeon = pigeonApiKey
      ? new PigeonClient(pigeonApiKey, options.pigeonOptions)
      : null;

    this.usePigeon = options.usePigeon !== false; // Default to true if available
  }

  /**
   * Check if Pigeon is available
   */
  _requirePigeon() {
    if (!this.pigeon) {
      throw new Error(
        'Pigeon API not configured. Set PIGEON_API_KEY to enable enhanced features.'
      );
    }
  }

  // ============================================================
  // ENHANCED PORTFOLIO METHODS
  // ============================================================

  /**
   * Get full token portfolio (not just SOL)
   * Uses Pigeon's Birdeye integration
   */
  async getTokenPortfolio(nameOrAddress) {
    this._requirePigeon();

    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    // Get SOL balance (free, from base class)
    const solBalance = await this.getBalance(address);

    // Get all token balances from Pigeon
    const pigeonBalances = await this.pigeon.getSolanaBalances(address);

    return {
      address,
      name: wallet?.name || 'Unknown',
      emoji: wallet?.emoji || '💼',
      solBalance,
      tokens: pigeonBalances.tokens || [],
      totalUsdValue: pigeonBalances.totalUsdValue || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get LLM-friendly portfolio summary
   */
  async getPortfolioSummary(nameOrAddress) {
    const portfolio = await this.getTokenPortfolio(nameOrAddress);

    let summary = `${portfolio.emoji} ${portfolio.name} Portfolio\n\n`;
    summary += `SOL: ${portfolio.solBalance.toFixed(4)} SOL\n`;

    if (portfolio.tokens.length > 0) {
      summary += `\nToken Holdings:\n`;

      portfolio.tokens
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, 10) // Top 10 tokens
        .forEach(token => {
          const change24h = token.priceChange24h > 0 ? '📈' : '📉';
          summary += `  ${token.symbol}: ${token.amount.toFixed(2)} ($${token.usdValue.toFixed(2)}) ${change24h} ${token.priceChange24h.toFixed(1)}%\n`;
        });

      if (portfolio.tokens.length > 10) {
        summary += `  ... and ${portfolio.tokens.length - 10} more tokens\n`;
      }
    }

    summary += `\n💰 Total Portfolio Value: $${portfolio.totalUsdValue.toFixed(2)}`;

    return summary;
  }

  // ============================================================
  // PNL TRACKING METHODS
  // ============================================================

  /**
   * Get PnL for a specific token
   */
  async getTokenPnL(nameOrAddress, tokenMint) {
    this._requirePigeon();

    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const pnl = await this.pigeon.calculateTokenPnL(address, tokenMint);

    return {
      wallet: wallet?.name || address,
      token: pnl.tokenSymbol,
      mint: tokenMint,
      realizedPnL: pnl.realizedPnL, // In SOL
      totalBought: pnl.totalBought,
      totalSold: pnl.totalSold,
      avgBuyPrice: pnl.avgBuyPrice,
      avgSellPrice: pnl.avgSellPrice,
      trades: pnl.numberOfTrades,
      profitable: pnl.realizedPnL > 0
    };
  }

  /**
   * Get complete PnL across all tokens
   * This is expensive - use sparingly
   */
  async getCompletePnL(nameOrAddress) {
    this._requirePigeon();

    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    // Get transaction history to find traded tokens
    const history = await this.pigeon.getTransactionHistory(address, 1000);

    // Extract unique token mints from swaps
    const tradedTokens = new Set();
    history.transactions
      ?.filter(tx => tx.type === 'swap')
      .forEach(tx => {
        tx.tokens?.forEach(token => tradedTokens.add(token.mint));
      });

    // Calculate PnL for each token
    const pnlResults = [];
    for (const tokenMint of tradedTokens) {
      try {
        const pnl = await this.getTokenPnL(address, tokenMint);
        pnlResults.push(pnl);
      } catch (error) {
        // Skip tokens that error out
        console.error(`Error calculating PnL for ${tokenMint}:`, error.message);
      }
    }

    const totalRealizedPnL = pnlResults.reduce((sum, p) => sum + p.realizedPnL, 0);

    return {
      wallet: wallet?.name || address,
      tokens: pnlResults,
      totalRealizedPnL,
      profitable: totalRealizedPnL > 0,
      winningTrades: pnlResults.filter(p => p.profitable).length,
      losingTrades: pnlResults.filter(p => !p.profitable).length,
      winRate: (pnlResults.filter(p => p.profitable).length / pnlResults.length) * 100
    };
  }

  /**
   * Get LLM-friendly PnL summary
   */
  async getPnLSummary(nameOrAddress) {
    const pnl = await this.getCompletePnL(nameOrAddress);

    let summary = `📊 PnL Report for ${pnl.wallet}\n\n`;
    summary += `Total Realized PnL: ${pnl.totalRealizedPnL > 0 ? '✅' : '❌'} ${pnl.totalRealizedPnL.toFixed(4)} SOL\n`;
    summary += `Win Rate: ${pnl.winRate.toFixed(1)}% (${pnl.winningTrades}W / ${pnl.losingTrades}L)\n`;

    summary += `\n🏆 Top Winners:\n`;
    pnl.tokens
      .filter(t => t.profitable)
      .sort((a, b) => b.realizedPnL - a.realizedPnL)
      .slice(0, 5)
      .forEach(t => {
        summary += `  ${t.token}: +${t.realizedPnL.toFixed(4)} SOL (${t.trades} trades)\n`;
      });

    summary += `\n📉 Top Losers:\n`;
    pnl.tokens
      .filter(t => !t.profitable)
      .sort((a, b) => a.realizedPnL - b.realizedPnL)
      .slice(0, 5)
      .forEach(t => {
        summary += `  ${t.token}: ${t.realizedPnL.toFixed(4)} SOL (${t.trades} trades)\n`;
      });

    return summary;
  }

  // ============================================================
  // WHALE DETECTION METHODS
  // ============================================================

  /**
   * Analyze token holder distribution
   */
  async analyzeTokenHolders(tokenMint) {
    this._requirePigeon();

    const stats = await this.pigeon.getHolderStatistics(tokenMint);

    return {
      tokenMint,
      totalHolders: stats.totalHolders,
      top10Concentration: stats.top10Concentration,
      top50Concentration: stats.top50Concentration,
      whaleCount: stats.whaleCount,
      distribution: stats.top10Concentration > 50 ? 'concentrated' : 'distributed',
      rugRisk: stats.top10Concentration > 70 ? 'HIGH' : stats.top10Concentration > 50 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Find which tokens our tracked wallets are whales in
   */
  async findWhaleHoldings() {
    this._requirePigeon();

    const results = [];

    for (const wallet of this.wallets) {
      try {
        const portfolio = await this.getTokenPortfolio(wallet.trackedWalletAddress);

        for (const token of portfolio.tokens) {
          try {
            const holderStats = await this.analyzeTokenHolders(token.mint);

            // Estimate wallet's percentage (simplified)
            // In reality, you'd need total supply data
            const isSignificantHolder = token.usdValue > 10000; // > $10k position

            if (isSignificantHolder) {
              results.push({
                wallet: wallet.name,
                token: token.symbol,
                holding: token.amount,
                usdValue: token.usdValue,
                holderStats: holderStats
              });
            }
          } catch (error) {
            // Skip tokens we can't analyze
          }
        }
      } catch (error) {
        console.error(`Error analyzing ${wallet.name}:`, error.message);
      }
    }

    return results;
  }

  // ============================================================
  // MARKET INTELLIGENCE METHODS
  // ============================================================

  /**
   * Discover trending tokens
   */
  async discoverTrendingTokens(chain = 'solana', limit = 20) {
    this._requirePigeon();

    const trending = await this.pigeon.discoverTrendingTokens(chain, limit);

    return trending.tokens?.map(token => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      priceChange24h: token.priceChange24h,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      trendScore: token.trendScore
    })) || [];
  }

  /**
   * Get social sentiment for a token
   */
  async getTokenSentiment(symbol) {
    this._requirePigeon();

    const sentiment = await this.pigeon.getSocialSentiment(symbol);

    return {
      symbol,
      sentimentScore: sentiment.sentimentScore,
      socialVolume: sentiment.socialVolume,
      bullishMentions: sentiment.bullishMentions,
      bearishMentions: sentiment.bearishMentions,
      netSentiment: sentiment.bullishMentions - sentiment.bearishMentions
    };
  }

  /**
   * Detect when tracked wallets buy trending tokens
   */
  async detectTrendingPurchases(nameOrAddress) {
    this._requirePigeon();

    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    // Get recent transactions
    const history = await this.pigeon.getTransactionHistory(address, 50);

    // Get trending tokens
    const trending = await this.discoverTrendingTokens();
    const trendingAddresses = new Set(trending.map(t => t.address));

    // Find intersection
    const trendingPurchases = history.transactions
      ?.filter(tx =>
        tx.type === 'swap' &&
        tx.tokens?.some(token => trendingAddresses.has(token.mint))
      )
      .map(tx => ({
        timestamp: tx.timestamp,
        token: tx.tokens.find(t => trendingAddresses.has(t.mint)),
        amount: tx.amount,
        usdValue: tx.usdValue
      })) || [];

    return {
      wallet: wallet?.name || address,
      trendingPurchases,
      count: trendingPurchases.length,
      summary: `Found ${trendingPurchases.length} purchases of trending tokens in last 50 transactions`
    };
  }

  // ============================================================
  // TRADING METHODS (CAUTION: REAL MONEY)
  // ============================================================

  /**
   * Execute a token swap via Jupiter
   * NOTE: This executes real trades!
   */
  async executeSwap(inputMint, outputMint, amount, options = {}) {
    this._requirePigeon();

    const { slippageBps = 100, dryRun = true } = options;

    if (!dryRun) {
      console.warn('⚠️  EXECUTING REAL TRADE ⚠️');
    }

    const result = await this.pigeon.jupiterSwap(
      inputMint,
      outputMint,
      amount,
      slippageBps
    );

    return {
      signature: result.signature,
      inputAmount: result.inputAmount,
      outputAmount: result.outputAmount,
      priceImpact: result.priceImpact,
      fee: result.fee,
      dryRun
    };
  }

  /**
   * Set a limit order
   */
  async setLimitOrder(inputMint, outputMint, amount, price, options = {}) {
    this._requirePigeon();

    const { dryRun = true } = options;

    if (!dryRun) {
      console.warn('⚠️  CREATING REAL LIMIT ORDER ⚠️');
    }

    const order = await this.pigeon.createLimitOrder(
      inputMint,
      outputMint,
      amount,
      price
    );

    return {
      orderId: order.orderId,
      status: order.status,
      expiresAt: order.expiresAt,
      dryRun
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get Pigeon spending stats
   */
  getPigeonStats() {
    if (!this.pigeon) {
      return { available: false };
    }

    return {
      available: true,
      ...this.pigeon.getSpendingStats()
    };
  }

  /**
   * Get enhanced summary of all wallets with Pigeon data
   */
  async getEnhancedSummary() {
    const summaries = [];

    for (const wallet of this.wallets) {
      try {
        const portfolio = await this.getTokenPortfolio(wallet.trackedWalletAddress);
        summaries.push({
          name: wallet.name,
          emoji: wallet.emoji,
          address: wallet.trackedWalletAddress,
          solBalance: portfolio.solBalance,
          totalUsdValue: portfolio.totalUsdValue,
          tokenCount: portfolio.tokens.length
        });
      } catch (error) {
        summaries.push({
          name: wallet.name,
          emoji: wallet.emoji,
          error: error.message
        });
      }
    }

    let output = '📊 Enhanced Wallet Summary\n\n';

    summaries.forEach(s => {
      if (s.error) {
        output += `${s.emoji} ${s.name}: ERROR - ${s.error}\n`;
      } else {
        output += `${s.emoji} ${s.name}: ${s.solBalance.toFixed(4)} SOL + ${s.tokenCount} tokens ($${s.totalUsdValue.toFixed(2)})\n`;
      }
    });

    const totalUsd = summaries
      .filter(s => !s.error)
      .reduce((sum, s) => sum + s.totalUsdValue, 0);

    output += `\n💰 Total Portfolio Value: $${totalUsd.toFixed(2)}`;

    // Add Pigeon stats
    const pigeonStats = this.getPigeonStats();
    if (pigeonStats.available) {
      output += `\n\n💸 Pigeon API: $${pigeonStats.spentToday.toFixed(2)}/$${pigeonStats.budget.toFixed(2)} used today`;
    }

    return output;
  }
}

export default EnhancedWalletTracker;
