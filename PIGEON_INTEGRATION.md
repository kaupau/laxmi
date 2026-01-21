# Pigeon API Integration Plan

## Overview

Integrate Pigeon.trade API to dramatically enhance the Laxmi Wallet Tracker with advanced analytics, trading capabilities, and market intelligence.

---

## Current State vs. Pigeon Enhancement

### What We Have Now
- ✅ Basic SOL balance tracking
- ✅ Simple transaction history (signatures only)
- ✅ Basic SOL balance changes extraction
- ✅ Token transfer detection
- ✅ Multi-wallet monitoring

### What Pigeon Adds
- 🚀 **Comprehensive transaction analysis** (swaps, deposits, withdrawals, NFT trades)
- 🚀 **Token PnL calculations** (realized profit/loss tracking)
- 🚀 **Holder statistics** (whale concentration, distribution analysis)
- 🚀 **Token balances via Birdeye** (all SPL tokens with USD values)
- 🚀 **Jupiter integration** (swaps and limit orders)
- 🚀 **Market intelligence** (trending tokens, sentiment, price data)
- 🚀 **Portfolio analytics** (cross-wallet insights)

---

## Key Integration Areas

### 1. Enhanced Transaction Analysis

**Current:** We only see transaction signatures and basic SOL changes.

**With Pigeon:** Get categorized transaction history with full context.

```javascript
// New method to add to WalletTracker
async getEnhancedTransactionHistory(nameOrAddress, limit = 100) {
  const wallet = this.getWalletByName(nameOrAddress);
  const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

  // Use Pigeon's comprehensive transaction history
  const pigeonHistory = await pigeonSdk.solana_get_transaction_history({
    walletAddress: address,
    limit: limit
  });

  return {
    address,
    name: wallet?.name || 'Unknown',
    emoji: wallet?.emoji || '💼',
    transactions: pigeonHistory.transactions.map(tx => ({
      signature: tx.signature,
      type: tx.type, // 'swap', 'transfer', 'deposit', 'withdrawal', 'nft_trade'
      timestamp: tx.timestamp,
      tokens: tx.tokens,
      amounts: tx.amounts,
      usdValue: tx.usdValue
    }))
  };
}
```

**Cost:** $0.01 per execution
**Value:** Complete transaction categorization instead of manual parsing

---

### 2. Token Portfolio Tracking

**Current:** We only track SOL balances.

**With Pigeon:** Track all SPL tokens with USD values.

```javascript
// New method to add
async getTokenPortfolio(nameOrAddress) {
  const wallet = this.getWalletByName(nameOrAddress);
  const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

  // Get all token balances via Birdeye
  const balances = await pigeonSdk.portfolio_solana_balances({
    walletAddress: address
  });

  return {
    address,
    name: wallet?.name || 'Unknown',
    emoji: wallet?.emoji || '💼',
    solBalance: await this.getBalance(address),
    tokens: balances.tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      amount: token.amount,
      usdValue: token.usdValue,
      mint: token.mint,
      priceChange24h: token.priceChange24h
    })),
    totalUsdValue: balances.totalUsdValue
  };
}

// LLM-friendly summary
async getPortfolioSummary(nameOrAddress) {
  const portfolio = await this.getTokenPortfolio(nameOrAddress);

  let summary = `${portfolio.emoji} ${portfolio.name} Portfolio\n\n`;
  summary += `SOL: ${portfolio.solBalance.toFixed(4)} SOL\n`;
  summary += `\nTokens:\n`;

  portfolio.tokens
    .sort((a, b) => b.usdValue - a.usdValue)
    .forEach(token => {
      summary += `  ${token.symbol}: ${token.amount} ($${token.usdValue.toFixed(2)})\n`;
    });

  summary += `\n💰 Total Portfolio Value: $${portfolio.totalUsdValue.toFixed(2)}`;

  return summary;
}
```

**Cost:** $0.01 per execution
**Value:** Full portfolio visibility with real USD values

---

### 3. PnL Tracking (GAME CHANGER)

**Current:** We have no idea if wallets are profitable.

**With Pigeon:** Track realized gains/losses for each token.

```javascript
// New method to add
async getTokenPnL(nameOrAddress, tokenMint) {
  const wallet = this.getWalletByName(nameOrAddress);
  const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

  const pnl = await pigeonSdk.solana_calculate_token_pnl({
    walletAddress: address,
    tokenMint: tokenMint
  });

  return {
    wallet: wallet?.name || address,
    token: pnl.tokenSymbol,
    realizedPnL: pnl.realizedPnL, // In SOL
    totalBought: pnl.totalBought,
    totalSold: pnl.totalSold,
    avgBuyPrice: pnl.avgBuyPrice,
    avgSellPrice: pnl.avgSellPrice,
    trades: pnl.numberOfTrades
  };
}

// Get PnL for all tokens a wallet has traded
async getCompletePnL(nameOrAddress) {
  const wallet = this.getWalletByName(nameOrAddress);
  const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

  // Get transaction history to find all traded tokens
  const history = await pigeonSdk.solana_get_transaction_history({
    walletAddress: address,
    limit: 1000
  });

  // Extract unique token mints from swaps
  const tradedTokens = new Set();
  history.transactions
    .filter(tx => tx.type === 'swap')
    .forEach(tx => {
      tx.tokens.forEach(token => tradedTokens.add(token.mint));
    });

  // Calculate PnL for each token
  const pnlResults = [];
  for (const tokenMint of tradedTokens) {
    try {
      const pnl = await this.getTokenPnL(address, tokenMint);
      pnlResults.push(pnl);
    } catch (error) {
      // Skip tokens that error out
    }
  }

  return {
    wallet: wallet?.name || address,
    tokens: pnlResults,
    totalRealizedPnL: pnlResults.reduce((sum, p) => sum + p.realizedPnL, 0)
  };
}
```

**Cost:** $0.01 per token per execution
**Value:** Know exactly which wallets are winning traders

---

### 4. Whale Detection & Token Analysis

**Current:** We manually track "whale" wallets.

**With Pigeon:** Automatically detect if tokens are whale-concentrated.

```javascript
// New method to add
async analyzeTokenHolders(tokenMint) {
  const stats = await pigeonSdk.solana_get_holder_statistics({
    tokenMint: tokenMint
  });

  return {
    tokenMint,
    totalHolders: stats.totalHolders,
    top10Concentration: stats.top10Concentration, // % held by top 10
    top50Concentration: stats.top50Concentration,
    whaleCount: stats.whaleCount, // Holders with >1% supply
    distribution: stats.distribution, // 'concentrated' or 'distributed'
    rugRisk: stats.top10Concentration > 50 ? 'HIGH' : 'LOW'
  };
}

// Check if any of our tracked wallets hold significant amounts
async findWhaleHoldings() {
  const results = [];

  for (const wallet of this.wallets) {
    const portfolio = await this.getTokenPortfolio(wallet.trackedWalletAddress);

    for (const token of portfolio.tokens) {
      const holderStats = await this.analyzeTokenHolders(token.mint);

      // Check if this wallet is a whale for this token
      const walletPercentage = (token.amount / holderStats.totalSupply) * 100;

      if (walletPercentage > 1) {
        results.push({
          wallet: wallet.name,
          token: token.symbol,
          holding: token.amount,
          percentageOfSupply: walletPercentage,
          isTopHolder: walletPercentage > 5
        });
      }
    }
  }

  return results;
}
```

**Cost:** $0.01 per token per execution
**Value:** Identify rug risks and whale movements

---

### 5. Market Intelligence & Token Discovery

**Current:** We have no market data.

**With Pigeon:** Get trending tokens, sentiment, and price data.

```javascript
// New methods to add
async discoverTrendingTokens(chain = 'solana') {
  const trending = await pigeonSdk.gecko_discover_trending_tokens_by_chain({
    blockchain: chain,
    limit: 20
  });

  return trending.tokens.map(token => ({
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    priceChange24h: token.priceChange24h,
    volume24h: token.volume24h,
    marketCap: token.marketCap,
    trendScore: token.trendScore
  }));
}

async analyzeTrendingTokenSentiment(tokenSymbol) {
  const sentiment = await pigeonSdk.lunarcrush_get_crypto_social_sentiment({
    symbol: tokenSymbol
  });

  return {
    symbol: tokenSymbol,
    sentimentScore: sentiment.sentimentScore, // -1 to 1
    socialVolume: sentiment.socialVolume,
    socialEngagement: sentiment.socialEngagement,
    bullishMentions: sentiment.bullishMentions,
    bearishMentions: sentiment.bearishMentions,
    viralTweets: sentiment.topTweets
  };
}

// Smart alert: notify when tracked wallets buy trending tokens
async detectTrendingPurchases(nameOrAddress) {
  const wallet = this.getWalletByName(nameOrAddress);
  const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

  // Get recent transactions
  const history = await pigeonSdk.solana_get_transaction_history({
    walletAddress: address,
    limit: 50
  });

  // Get trending tokens
  const trending = await this.discoverTrendingTokens();
  const trendingAddresses = new Set(trending.map(t => t.address));

  // Find intersection
  const trendingPurchases = history.transactions
    .filter(tx =>
      tx.type === 'swap' &&
      tx.tokens.some(token => trendingAddresses.has(token.mint))
    )
    .map(tx => ({
      timestamp: tx.timestamp,
      token: tx.tokens.find(t => trendingAddresses.has(t.mint)),
      amount: tx.amount,
      usdValue: tx.usdValue
    }));

  return {
    wallet: wallet?.name || address,
    trendingPurchases,
    summary: `Found ${trendingPurchases.length} purchases of trending tokens`
  };
}
```

**Cost:** $0.01-$0.02 per query
**Value:** Discover what smart money is buying before it pumps

---

### 6. Automated Trading with Jupiter

**Current:** Manual trading only.

**With Pigeon:** Execute swaps and set limit orders.

```javascript
// New methods to add (requires Pigeon wallet integration)
async executeSwap(inputMint, outputMint, amount) {
  const result = await pigeonSdk.solana_jupiter_swap({
    inputMint: inputMint,
    outputMint: outputMint,
    amount: amount, // Human-readable amount
    slippageBps: 100 // 1% slippage
  });

  return {
    signature: result.signature,
    inputAmount: result.inputAmount,
    outputAmount: result.outputAmount,
    priceImpact: result.priceImpact,
    fee: result.fee
  };
}

async setLimitOrder(inputMint, outputMint, amount, price) {
  const order = await pigeonSdk.solana_jupiter_create_limit_order({
    inputMint: inputMint,
    outputMint: outputMint,
    inputAmount: amount,
    price: price // Price at which to execute
  });

  return {
    orderId: order.orderId,
    status: order.status,
    expiresAt: order.expiresAt
  };
}

// Copy trading: mirror a wallet's swaps
async enableCopyTrading(targetWallet, config = {}) {
  const {
    maxTradeSize = 0.1, // Max 0.1 SOL per trade
    minTradeSize = 0.01,
    copyPercentage = 10 // Copy 10% of their trade size
  } = config;

  // This would run in a monitoring loop
  const monitor = setInterval(async () => {
    const history = await pigeonSdk.solana_get_transaction_history({
      walletAddress: targetWallet,
      limit: 10
    });

    const recentSwaps = history.transactions
      .filter(tx => tx.type === 'swap')
      .filter(tx => Date.now() - tx.timestamp < 60000); // Last minute

    for (const swap of recentSwaps) {
      const copyAmount = Math.min(
        swap.amount * (copyPercentage / 100),
        maxTradeSize
      );

      if (copyAmount >= minTradeSize) {
        await this.executeSwap(
          swap.inputToken.mint,
          swap.outputToken.mint,
          copyAmount
        );
      }
    }
  }, 30000); // Check every 30 seconds

  return monitor;
}
```

**Cost:** Gas fees + Pigeon fees
**Value:** Automated execution of trading strategies

---

## Implementation Priority

### Phase 1: Enhanced Analytics (Week 1)
1. ✅ Integrate token portfolio tracking (`portfolio_solana_balances`)
2. ✅ Add comprehensive transaction history (`solana_get_transaction_history`)
3. ✅ Implement PnL tracking (`solana_calculate_token_pnl`)

**Immediate Value:** See full portfolio + profitability of tracked wallets

### Phase 2: Market Intelligence (Week 2)
1. ✅ Add trending token discovery
2. ✅ Integrate sentiment analysis
3. ✅ Build whale detection alerts
4. ✅ Create "smart money detector" (wallets buying trending tokens early)

**Immediate Value:** Discover opportunities before they pump

### Phase 3: Trading Automation (Week 3)
1. ✅ Integrate Jupiter swap functionality
2. ✅ Add limit order management
3. ✅ Build copy trading engine
4. ✅ Create automated strategies based on wallet analysis

**Immediate Value:** Execute trades automatically based on whale movements

### Phase 4: AI Agent Enhancement (Week 4)
1. ✅ Update AI agent examples to use Pigeon data
2. ✅ Create comprehensive prompts for LLM analysis
3. ✅ Build conversational interface for all features
4. ✅ Add autonomous decision-making agents

**Immediate Value:** Full AI-powered trading assistant

---

## Technical Architecture

### New Module Structure

```
src/
  tracker.js          # Existing - basic tracking
  pigeon-client.js    # NEW - Pigeon API wrapper
  portfolio.js        # NEW - Enhanced portfolio tracking
  analytics.js        # NEW - PnL, whale detection, etc.
  intelligence.js     # NEW - Market data, trending, sentiment
  trading.js          # NEW - Jupiter integration, copy trading
  agents/
    portfolio-agent.js    # AI portfolio analyst
    trading-agent.js      # AI trading decision maker
    whale-agent.js        # Whale movement detector
```

### Configuration

```javascript
// .env additions
PIGEON_API_KEY=your_api_key_here
PIGEON_WALLET_ADDRESS=your_trading_wallet
PIGEON_ENABLE_TRADING=false  # Safety flag
```

### Cost Management

```javascript
class PigeonClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.budget = options.dailyBudget || 1.00; // $1/day default
    this.spentToday = 0;
    this.cache = new Map(); // Cache results to reduce costs
  }

  async callWithBudget(method, params, cost) {
    if (this.spentToday + cost > this.budget) {
      throw new Error('Daily budget exceeded');
    }

    // Check cache first
    const cacheKey = `${method}:${JSON.stringify(params)}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 min cache
        return cached.data;
      }
    }

    // Make API call
    const result = await pigeonSdk[method](params);

    this.spentToday += cost;
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }
}
```

---

## Use Cases & Examples

### 1. Whale Profit Analysis

```javascript
// Which whale is most profitable?
const tracker = new WalletTracker();
tracker.loadWallets();

for (const wallet of tracker.wallets) {
  const pnl = await tracker.getCompletePnL(wallet.name);
  console.log(`${wallet.emoji} ${wallet.name}: ${pnl.totalRealizedPnL.toFixed(4)} SOL profit`);
}

// Output:
// 🐳 whale: +45.3421 SOL profit
// 👻 Magi2: -2.1234 SOL profit
// ...
```

### 2. Smart Money Detector

```javascript
// What are whales buying right now?
const trending = await tracker.discoverTrendingTokens();

for (const wallet of tracker.wallets) {
  const purchases = await tracker.detectTrendingPurchases(wallet.name);
  if (purchases.trendingPurchases.length > 0) {
    console.log(`🚨 ${wallet.name} bought trending tokens:`);
    purchases.trendingPurchases.forEach(p => {
      console.log(`  - ${p.token.symbol}: $${p.usdValue}`);
    });
  }
}
```

### 3. Automated Copy Trading

```javascript
// Copy the whale's trades automatically
const whaleAddress = tracker.getWalletByName('whale').trackedWalletAddress;

const copyTradingBot = await tracker.enableCopyTrading(whaleAddress, {
  maxTradeSize: 0.1,
  copyPercentage: 5 // Copy 5% of their size
});

console.log('🤖 Copy trading bot started. Monitoring whale...');
```

### 4. Portfolio Health Check

```javascript
// Full portfolio analysis for LLM
async function analyzePortfolio(walletName) {
  const portfolio = await tracker.getTokenPortfolio(walletName);
  const pnl = await tracker.getCompletePnL(walletName);

  const context = `
Portfolio Analysis for ${walletName}:

Total Value: $${portfolio.totalUsdValue.toFixed(2)}
Realized PnL: ${pnl.totalRealizedPnL.toFixed(4)} SOL

Holdings:
${portfolio.tokens.map(t =>
  `- ${t.symbol}: ${t.amount} ($${t.usdValue.toFixed(2)}, ${t.priceChange24h > 0 ? '📈' : '📉'} ${t.priceChange24h.toFixed(2)}%)`
).join('\n')}

Top Performing Trades:
${pnl.tokens
  .sort((a, b) => b.realizedPnL - a.realizedPnL)
  .slice(0, 5)
  .map(t => `- ${t.token}: ${t.realizedPnL > 0 ? '+' : ''}${t.realizedPnL.toFixed(4)} SOL`)
  .join('\n')}
  `;

  // Send to LLM for analysis
  const analysis = await askClaude(`
    Analyze this portfolio and provide recommendations:
    ${context}

    Consider:
    1. Is this portfolio well-diversified?
    2. Are there any risky positions?
    3. What should they do next?
  `);

  return analysis;
}
```

---

## Migration Path

### Step 1: Add Pigeon Client
```bash
npm install pigeon-sdk  # (if they have an npm package)
# or use their API directly
```

### Step 2: Update WalletTracker Class
- Add Pigeon methods alongside existing ones
- Keep existing methods working (no breaking changes)
- Add `usePigeon: boolean` flag to methods

### Step 3: Gradual Adoption
```javascript
// Old way still works
const balance = await tracker.getBalance(address);

// New way adds more data
const portfolio = await tracker.getTokenPortfolio(address); // uses Pigeon
```

### Step 4: New Features
- Add new methods that only Pigeon enables (PnL, sentiment, etc.)
- Update examples to showcase Pigeon features
- Update CLAUDE.md with Pigeon integration examples

---

## Cost Estimation

### Conservative Usage (10 tracked wallets)

| Feature | Calls/Day | Cost/Call | Daily Cost |
|---------|-----------|-----------|------------|
| Portfolio balances | 10 | $0.01 | $0.10 |
| Transaction history | 10 | $0.01 | $0.10 |
| PnL calculations (3 tokens avg) | 30 | $0.01 | $0.30 |
| Holder statistics (spot checks) | 5 | $0.01 | $0.05 |
| Trending tokens | 2 | $0.01 | $0.02 |
| Sentiment analysis | 2 | $0.01 | $0.02 |

**Total Daily Cost: ~$0.59/day (~$18/month)**

### Aggressive Usage (with copy trading)

- **~$1.50/day (~$45/month)** + gas fees for actual trades

### Free Tier Possibilities
Some Pigeon features are free:
- Portfolio Hyperliquid
- Portfolio Ostium
- Polymarket endpoints
- TON balance queries
- Jupiter limit order viewing

---

## Next Steps

1. **Get Pigeon API Key** → Sign up at pigeon.trade
2. **Build Pigeon Client Wrapper** → Create `src/pigeon-client.js`
3. **Add Portfolio Tracking** → Implement `getTokenPortfolio()`
4. **Add PnL Tracking** → Implement `getTokenPnL()`
5. **Create Examples** → Show off new capabilities
6. **Update CLAUDE.md** → Document for AI agents
7. **Build Trading Bot** → Copy trading + automated strategies

---

## Questions to Answer

1. **Do we want Pigeon as primary or fallback?**
   - Option A: Use Pigeon for everything (faster, more features)
   - Option B: Use Pigeon only for features we can't do ourselves

2. **How do we handle API costs?**
   - Built-in budget management
   - Caching strategy
   - Rate limiting

3. **Do we enable trading features?**
   - Start with read-only analytics
   - Add trading later with safety flags

4. **What's the primary use case?**
   - Whale watching + alerts
   - Copy trading automation
   - Portfolio management
   - All of the above

---

## Conclusion

Integrating Pigeon API transforms Laxmi from a basic wallet tracker into a **professional-grade trading intelligence platform**.

**Biggest Wins:**
1. 📊 **PnL Tracking** - Know who's actually profitable
2. 🐋 **Whale Detection** - Identify concentrated tokens/big players
3. 📈 **Market Intelligence** - Discover trending tokens early
4. 🤖 **Trading Automation** - Execute strategies automatically
5. 💰 **Full Portfolio View** - All tokens with USD values

**Best Part:** All of this is LLM-friendly, so your AI agents get superpowers! 🚀
