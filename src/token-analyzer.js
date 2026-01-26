import fetch from 'node-fetch';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * TokenAnalyzer - Analyzes tokens for trading decisions
 *
 * Features:
 * - Market cap filtering ($30K-$300K sweet spot)
 * - Volume trend analysis
 * - Whale holder analysis
 * - Related wallet detection
 */
export class TokenAnalyzer {
  constructor(rpcUrl, trackedWallets = []) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.trackedWallets = trackedWallets; // Array of {name, address, emoji}
  }

  /**
   * Get token metadata from DexScreener
   */
  async getTokenMetadata(tokenMint) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }

      // Get the most liquid pair (highest liquidity)
      const mainPair = data.pairs.reduce((best, pair) => {
        const liquidity = parseFloat(pair.liquidity?.usd || 0);
        const bestLiquidity = parseFloat(best.liquidity?.usd || 0);
        return liquidity > bestLiquidity ? pair : best;
      }, data.pairs[0]);

      return {
        address: tokenMint,
        symbol: mainPair.baseToken?.symbol || 'UNKNOWN',
        name: mainPair.baseToken?.name || 'Unknown Token',
        marketCap: parseFloat(mainPair.fdv || mainPair.marketCap || 0),
        price: parseFloat(mainPair.priceUsd || 0),
        liquidity: parseFloat(mainPair.liquidity?.usd || 0),
        volume24h: parseFloat(mainPair.volume?.h24 || 0),
        volume5m: parseFloat(mainPair.volume?.m5 || 0),
        volume1h: parseFloat(mainPair.volume?.h1 || 0),
        priceChange24h: parseFloat(mainPair.priceChange?.h24 || 0),
        priceChange5m: parseFloat(mainPair.priceChange?.m5 || 0),
        priceChange1h: parseFloat(mainPair.priceChange?.h1 || 0),
        pairAddress: mainPair.pairAddress,
        dexId: mainPair.dexId,
        url: mainPair.url,
        createdAt: mainPair.pairCreatedAt
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error.message);
      return null;
    }
  }

  /**
   * Check if market cap is in target range ($30K-$300K)
   */
  isMarketCapInRange(marketCap, min = 30000, max = 300000) {
    return marketCap >= min && marketCap <= max;
  }

  /**
   * Analyze volume trends
   * Returns momentum score based on recent vs historical volume
   */
  analyzeVolumeTrend(metadata) {
    if (!metadata) return null;

    const { volume5m, volume1h, volume24h } = metadata;

    // Calculate average volume per 5min over different periods
    const avg5mOver1h = volume1h / 12; // 12 five-minute periods in 1 hour
    const avg5mOver24h = volume24h / 288; // 288 five-minute periods in 24 hours

    const recent5mVsHour = volume5m / (avg5mOver1h || 1);
    const recent5mVsDay = volume5m / (avg5mOver24h || 1);

    return {
      volume5m,
      volume1h,
      volume24h,
      recentVsHourMultiplier: recent5mVsHour,
      recentVsDayMultiplier: recent5mVsDay,
      momentum: recent5mVsHour >= 2 ? 'high' : recent5mVsHour >= 1.5 ? 'medium' : 'low',
      isHeatingUp: recent5mVsHour > 1.5 && recent5mVsDay > 2
    };
  }

  /**
   * Find other tracked wallets that hold this token
   */
  async findOtherWhalesHolding(tokenMint, excludeWallet = null) {
    const holdingWallets = [];

    for (const wallet of this.trackedWallets) {
      if (excludeWallet && wallet.trackedWalletAddress === excludeWallet) {
        continue; // Skip the wallet that triggered the alert
      }

      try {
        // Get token accounts for this wallet
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          new PublicKey(wallet.trackedWalletAddress),
          { mint: new PublicKey(tokenMint) }
        );

        if (tokenAccounts.value.length > 0) {
          const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;

          if (balance > 0) {
            holdingWallets.push({
              name: wallet.name,
              emoji: wallet.emoji,
              address: wallet.trackedWalletAddress,
              balance
            });
          }
        }
      } catch (error) {
        // Silently skip errors for individual wallets
        console.error(`Error checking ${wallet.name}:`, error.message);
      }
    }

    return holdingWallets;
  }

  /**
   * Get token holder count and distribution
   */
  async getHolderStats(tokenMint) {
    try {
      // Get top holders from token accounts
      const accounts = await this.connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: tokenMint } }
          ]
        }
      );

      return {
        holderCount: accounts.length,
        // Could add more distribution analysis here
      };
    } catch (error) {
      console.error('Error getting holder stats:', error.message);
      return { holderCount: 0 };
    }
  }

  /**
   * Comprehensive token analysis
   */
  async analyzeToken(tokenMint, buyerWallet = null) {
    console.log(`🔍 Analyzing token: ${tokenMint.slice(0, 8)}...`);

    // Get token metadata
    const metadata = await this.getTokenMetadata(tokenMint);

    if (!metadata) {
      return {
        success: false,
        reason: 'Could not fetch token metadata'
      };
    }

    // Check market cap range
    const inRange = this.isMarketCapInRange(metadata.marketCap);

    // Analyze volume trends
    const volumeTrend = this.analyzeVolumeTrend(metadata);

    // Find other whales holding
    const otherWhales = await this.findOtherWhalesHolding(tokenMint, buyerWallet);

    // Calculate age of token
    const tokenAgeHours = metadata.createdAt
      ? (Date.now() - metadata.createdAt) / (1000 * 60 * 60)
      : null;

    return {
      success: true,
      token: {
        address: tokenMint,
        symbol: metadata.symbol,
        name: metadata.name,
        url: metadata.url
      },
      marketData: {
        marketCap: metadata.marketCap,
        marketCapFormatted: `$${(metadata.marketCap / 1000).toFixed(1)}K`,
        inTargetRange: inRange,
        targetRange: '$30K-$300K',
        price: metadata.price,
        liquidity: metadata.liquidity,
        liquidityFormatted: `$${(metadata.liquidity / 1000).toFixed(1)}K`
      },
      volumeAnalysis: volumeTrend,
      priceAction: {
        change24h: metadata.priceChange24h,
        change1h: metadata.priceChange1h,
        change5m: metadata.priceChange5m
      },
      whaleActivity: {
        otherWhalesHolding: otherWhales,
        whaleCount: otherWhales.length
      },
      tokenAge: {
        hours: tokenAgeHours,
        isNew: tokenAgeHours < 24
      },
      dex: {
        name: metadata.dexId,
        pairAddress: metadata.pairAddress
      }
    };
  }

  /**
   * Generate simple scoring for quick decisions
   */
  scoreToken(analysis) {
    if (!analysis.success) {
      return { score: 0, signals: ['No data available'] };
    }

    let score = 50; // Start at neutral
    const signals = [];

    // Market cap check (most important)
    if (analysis.marketData.inTargetRange) {
      score += 20;
      signals.push('✅ Market cap in sweet spot');
    } else if (analysis.marketData.marketCap < 30000) {
      score -= 10;
      signals.push('⚠️ Market cap too low (risky)');
    } else {
      score -= 20;
      signals.push('❌ Market cap too high');
    }

    // Volume momentum
    if (analysis.volumeAnalysis?.isHeatingUp) {
      score += 15;
      signals.push('🔥 Volume heating up');
    } else if (analysis.volumeAnalysis?.momentum === 'medium') {
      score += 5;
      signals.push('📊 Decent volume');
    } else if (analysis.volumeAnalysis?.momentum === 'low') {
      score -= 5;
      signals.push('📉 Low volume');
    }

    // Other whales holding
    if (analysis.whaleActivity.whaleCount > 2) {
      score += 15;
      signals.push(`🐋 ${analysis.whaleActivity.whaleCount} other whales holding`);
    } else if (analysis.whaleActivity.whaleCount > 0) {
      score += 5;
      signals.push(`👀 ${analysis.whaleActivity.whaleCount} other whale(s) holding`);
    }

    // Token age
    if (analysis.tokenAge.isNew && analysis.tokenAge.hours < 1) {
      score += 10;
      signals.push('🆕 Very new token');
    } else if (analysis.tokenAge.isNew) {
      score += 5;
      signals.push('✨ Fresh token');
    }

    // Price action
    if (analysis.priceAction.change5m > 10) {
      score += 10;
      signals.push('📈 Pumping now');
    } else if (analysis.priceAction.change5m < -10) {
      score -= 10;
      signals.push('📉 Dumping');
    }

    // Liquidity check
    if (analysis.marketData.liquidity < 10000) {
      score -= 15;
      signals.push('⚠️ Low liquidity (hard to exit)');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      signals,
      recommendation: score >= 70 ? 'BUY' : score >= 50 ? 'WATCH' : 'SKIP'
    };
  }
}

export default TokenAnalyzer;
