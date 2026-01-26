# Pigeon Integration - Quick Start Guide

## 🎯 What You Get in 5 Minutes

Transform your basic wallet tracker into a professional trading intelligence platform.

---

## Before vs. After

### WITHOUT Pigeon (Current)
```javascript
const tracker = new WalletTracker();
tracker.loadWallets();

const info = await tracker.getWalletInfo('whale');
console.log(info);

// Output:
// {
//   address: "HYWo71Wk9...",
//   name: "whale",
//   balance: 347.5164,
//   balanceFormatted: "347.5164 SOL"
// }
```

😕 **Problems:**
- Only see SOL balance (what about their tokens?)
- No idea if they're profitable
- Can't tell what they're trading
- No market context

### WITH Pigeon Integration
```javascript
const tracker = new EnhancedWalletTracker(rpc, PIGEON_API_KEY);
tracker.loadWallets();

// 1. Full portfolio
const portfolio = await tracker.getTokenPortfolio('whale');
console.log(`Total Value: $${portfolio.totalUsdValue.toFixed(2)}`);
console.log(`Tokens: ${portfolio.tokens.length}`);

// 2. Profitability
const pnl = await tracker.getCompletePnL('whale');
console.log(`Realized PnL: ${pnl.totalRealizedPnL.toFixed(4)} SOL`);
console.log(`Win Rate: ${pnl.winRate.toFixed(1)}%`);

// 3. What's trending
const trending = await tracker.discoverTrendingTokens('solana', 10);
console.log('Hot tokens:', trending.map(t => t.symbol));

// 4. Smart money detector
const smartMoves = await tracker.detectTrendingPurchases('whale');
console.log(`Whale bought ${smartMoves.count} trending tokens!`);

// Output:
// Total Value: $12,453.87
// Tokens: 23
// Realized PnL: +45.3421 SOL
// Win Rate: 68.2%
// Hot tokens: ['BONK', 'WIF', 'PONKE', 'MYRO', 'SILLY']
// Whale bought 2 trending tokens!
```

😍 **Now you know:**
- ✅ Full portfolio with USD values
- ✅ Whether they're actually making money
- ✅ What's hot in the market
- ✅ When smart money is moving

---

## Setup (2 Minutes)

### 1. Get API Key
```bash
# Go to https://pigeon.trade
# Sign up and get your API key
```

### 2. Set Environment Variable
```bash
# Add to your .env file
echo "PIGEON_API_KEY=your_key_here" >> .env

# Or export it
export PIGEON_API_KEY=your_key_here
```

### 3. Install Dependencies (if needed)
```bash
# For AI agent example only
npm install @anthropic-ai/sdk
```

---

## Try It Now (3 Minutes)

### Demo 1: See Your Full Portfolio
```bash
node examples/pigeon-demo.js
```

This will show you:
1. 📊 Full token portfolios with USD values
2. 💰 Realized profit/loss for each wallet
3. 🔥 Currently trending tokens on Solana
4. 🚨 Whale movements on trending tokens
5. 💸 Your Pigeon API budget usage

**Expected Output:**
```
🚀 Pigeon API Integration Demo

============================================================
DEMO 1: Enhanced Portfolio Tracking
============================================================
Analyzing: 🐳 whale

SOL Balance: 347.5164 SOL
Total Tokens: 23
Total USD Value: $12,453.87

Top Holdings:
1. BONK: 45,234,567.89 ($3,421.23)
2. WIF: 123.45 ($2,876.54)
3. PONKE: 1,234.56 ($1,987.32)
4. MYRO: 456.78 ($876.54)
5. SILLY: 789.01 ($543.21)

✨ LLM-Friendly Summary:
------------------------------------------------------------
🐳 whale Portfolio

SOL: 347.5164 SOL

Token Holdings:
  BONK: 45234567.89 ($3421.23) 📈 +12.5%
  WIF: 123.45 ($2876.54) 📈 +8.3%
  PONKE: 1234.56 ($1987.32) 📉 -2.1%
  ...

💰 Total Portfolio Value: $12,453.87
```

### Demo 2: AI Agent Analysis
```bash
# Set up Anthropic API key first
export ANTHROPIC_API_KEY=your_claude_key

# Run AI agent
node examples/ai-agent.js
```

This will:
1. 🤖 Analyze wallet performance with AI
2. 📊 Compare all tracked wallets
3. 💬 Answer questions about your wallets
4. 🎯 Provide trading recommendations

**Expected Output:**
```
🚀 AI Trading Agent Demo

============================================================
DEMO 1: Single Wallet Analysis
============================================================

🔍 Analyzing whale...

🧠 AI Analysis:

Based on the comprehensive data provided, here's my analysis of the "whale" wallet:

**Overall Assessment:**
This wallet demonstrates a strong track record with a realized profit of +45.34 SOL
and a 68% win rate across 33 trades. The trader appears to be an early identifier
of trending meme tokens, with particular success in BONK and WIF.

**Risk Analysis:**
HIGH RISK - The portfolio is heavily concentrated in meme tokens (85% of value).
While this has been profitable, these assets are highly volatile. The top 5
holdings represent 87% of portfolio value, showing poor diversification.

**Actionable Recommendations:**
1. COPY SELECTIVELY: Mirror only trades above 5 SOL to capture high-conviction plays
2. SET STOP LOSSES: Meme coins can dump 50%+ in hours
3. TAKE PROFITS: Consider copying their SELLS as well as buys
4. MONITOR CLOSELY: 30-minute intervals recommended

**Copy Trading Decision:**
YES, WITH CAUTION. This wallet has proven alpha-finding ability, but implement
strict risk management. Copy 5-10% of their position sizes, not 1:1.

**Red Flags:**
- Recent losing streak (last 3 trades unprofitable)
- Increasing position sizes (potentially overconfident)
- Heavy concentration in PONKE (62% of one token - high rug risk)

**Conclusion:**
Strong performer, but manage risk carefully. Perfect for small position copy trading.
```

---

## Real-World Use Cases

### Use Case 1: Find the Best Trader
```javascript
// Compare all your tracked wallets
const wallets = ['whale', 'gremlin', 'Magi2', 'devnet_tester'];
const performances = [];

for (const wallet of wallets) {
  const pnl = await tracker.getCompletePnL(wallet);
  performances.push({
    name: wallet,
    pnl: pnl.totalRealizedPnL,
    winRate: pnl.winRate,
    trades: pnl.winningTrades + pnl.losingTrades
  });
}

// Sort by profitability
performances.sort((a, b) => b.pnl - a.pnl);

console.log('🏆 Best Performer:', performances[0].name);
console.log(`   PnL: +${performances[0].pnl.toFixed(4)} SOL`);
console.log(`   Win Rate: ${performances[0].winRate.toFixed(1)}%`);

// Output:
// 🏆 Best Performer: whale
//    PnL: +45.3421 SOL
//    Win Rate: 68.2%
```

### Use Case 2: Detect Smart Money Early
```javascript
// Run this every 30 minutes
async function detectSmartMoney() {
  // Get trending tokens
  const trending = await tracker.discoverTrendingTokens('solana', 20);
  const trendingAddresses = new Set(trending.map(t => t.address));

  // Check which whales are buying them
  for (const wallet of tracker.wallets) {
    const buys = await tracker.detectTrendingPurchases(wallet.name);

    if (buys.count > 0) {
      console.log(`\n🚨 ALERT: ${wallet.emoji} ${wallet.name} bought trending tokens!`);

      for (const buy of buys.trendingPurchases) {
        const token = trending.find(t => t.address === buy.token.mint);
        console.log(`\n💎 ${buy.token.symbol}`);
        console.log(`   Whale bought: $${buy.usdValue.toFixed(2)}`);
        console.log(`   24h change: ${token.priceChange24h.toFixed(1)}%`);
        console.log(`   Rank: #${trending.indexOf(token) + 1} trending`);

        // Get sentiment
        const sentiment = await tracker.getTokenSentiment(buy.token.symbol);
        console.log(`   Sentiment: ${sentiment.sentimentScore > 0 ? '😊' : '😟'} ${sentiment.sentimentScore.toFixed(2)}`);
      }

      console.log('\n💡 Recommendation: Consider buying this token!');
    }
  }
}

// Output:
// 🚨 ALERT: 🐳 whale bought trending tokens!
//
// 💎 BONK
//    Whale bought: $3,421.23
//    24h change: +12.5%
//    Rank: #1 trending
//    Sentiment: 😊 0.78
//
// 💡 Recommendation: Consider buying this token!
```

### Use Case 3: Portfolio Health Check
```javascript
async function checkPortfolioHealth(walletName) {
  const portfolio = await tracker.getTokenPortfolio(walletName);
  const pnl = await tracker.getCompletePnL(walletName);

  // Calculate concentration risk
  const topHoldingPercent = (portfolio.tokens[0].usdValue / portfolio.totalUsdValue) * 100;

  console.log(`\n📊 Portfolio Health: ${walletName}`);
  console.log(`Total Value: $${portfolio.totalUsdValue.toFixed(2)}`);
  console.log(`Realized PnL: ${pnl.totalRealizedPnL > 0 ? '✅' : '❌'} ${pnl.totalRealizedPnL.toFixed(4)} SOL`);
  console.log(`Win Rate: ${pnl.winRate.toFixed(1)}%`);
  console.log(`Diversification: ${portfolio.tokens.length} tokens`);
  console.log(`Top Holding: ${topHoldingPercent.toFixed(1)}% of portfolio`);

  // Risk assessment
  if (topHoldingPercent > 50) {
    console.log('\n⚠️  HIGH RISK: Portfolio too concentrated!');
  } else if (topHoldingPercent > 30) {
    console.log('\n⚡ MEDIUM RISK: Consider diversifying');
  } else {
    console.log('\n✅ HEALTHY: Good diversification');
  }

  // Check for rug risks
  console.log('\n🔍 Checking for rug risks...');
  for (const token of portfolio.tokens.slice(0, 5)) {
    const holderStats = await tracker.analyzeTokenHolders(token.mint);
    if (holderStats.rugRisk === 'HIGH') {
      console.log(`⚠️  ${token.symbol}: HIGH RUG RISK (Top 10 hold ${holderStats.top10Concentration}%)`);
    }
  }
}

// Output:
// 📊 Portfolio Health: whale
// Total Value: $12,453.87
// Realized PnL: ✅ +45.3421 SOL
// Win Rate: 68.2%
// Diversification: 23 tokens
// Top Holding: 27.5% of portfolio
//
// ✅ HEALTHY: Good diversification
//
// 🔍 Checking for rug risks...
// ⚠️  PONKE: HIGH RUG RISK (Top 10 hold 73%)
```

---

## Cost Calculator

```javascript
// Check your current spending
const stats = tracker.getPigeonStats();

console.log(`Daily Budget: $${stats.budget.toFixed(2)}`);
console.log(`Spent Today: $${stats.spentToday.toFixed(2)}`);
console.log(`Remaining: $${stats.remaining.toFixed(2)}`);
console.log(`Usage: ${stats.percentUsed.toFixed(1)}%`);

// Output:
// Daily Budget: $1.00
// Spent Today: $0.23
// Remaining: $0.77
// Usage: 23.0%
```

**Typical Costs:**
- Check 10 wallets portfolio: $0.10
- Get PnL for 3 tokens each: $0.30
- Check trending tokens: $0.01
- Get sentiment for 2 tokens: $0.02
- **Total: ~$0.43 per run**

Run 3x per day = **$1.29/day** or **~$39/month**

---

## What to Do Next

### Today (5 minutes)
1. ✅ Run `node examples/pigeon-demo.js`
2. ✅ See your full portfolio + PnL
3. ✅ Identify best performing wallet

### This Week
1. Set up automated monitoring (every 30 min)
2. Create alerts for trending token purchases
3. Track whale PnL daily

### This Month
1. Build custom AI agent for your strategy
2. Implement copy trading for best performer
3. Optimize portfolio based on insights

---

## FAQ

**Q: Do I need to change my existing code?**
A: No! `EnhancedWalletTracker` extends `WalletTracker`. All your existing code works.

**Q: What if I don't have a Pigeon API key?**
A: The basic tracker still works. Pigeon adds advanced features.

**Q: How much does this cost?**
A: ~$0.60-$1.50/day depending on usage. Built-in budget limits prevent surprises.

**Q: Can I try it for free?**
A: Pigeon has free tiers for some features. Check their pricing.

**Q: Is this safe for production?**
A: Yes! Start with read-only features (analytics). Add trading later.

---

## Support

- 📚 Full guide: `PIGEON_INTEGRATION.md`
- 💻 Code examples: `examples/`
- 🤖 AI agent: `CLAUDE.md`
- 💬 Issues: https://github.com/anthropics/claude-code/issues

---

## Summary

**Before:** Basic SOL balance tracker
**After:** Professional trading intelligence platform

**You can now:**
- ✅ See full token portfolios with USD values
- ✅ Calculate profit/loss for any wallet
- ✅ Detect whale movements on trending tokens
- ✅ Get AI-powered trading recommendations
- ✅ Automate your entire trading workflow

**Start now:** `node examples/pigeon-demo.js` 🚀
