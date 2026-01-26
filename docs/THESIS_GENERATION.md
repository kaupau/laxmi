# AI Trade Thesis Generation

## 🎉 Feature Overview

Your bot now automatically generates AI-powered trade recommendations for every token transfer alert!

When a tracked wallet buys a token, the bot:
1. **Analyzes** market cap, volume trends, liquidity
2. **Researches** other whales holding the same token
3. **Generates** an AI thesis with BUY/WATCH/SKIP recommendation
4. **Displays** the thesis directly in your Telegram alert

## 📊 Analysis Criteria

### Market Cap Filtering
- **Sweet Spot:** $30K - $300K
- ✅ **In range:** +20 points
- ⚠️ **Too low (<$30K):** -10 points (high risk)
- ❌ **Too high (>$300K):** -20 points (less upside potential)

### Volume Momentum
- **Recent 5min vs 1H average:**
  - 🔥 **>2x:** High momentum (+15 points)
  - 📊 **1.5-2x:** Medium momentum (+5 points)
  - 📉 **<1.5x:** Low momentum (-5 points)

- **Recent 5min vs 24H average:**
  - Combined with 1H analysis for "heating up" signal

### Whale Activity
- 🐋 **3+ other tracked whales holding:** +15 points
- 👀 **1-2 whales holding:** +5 points
- **Lists which whales** are holding and how much

### Token Age
- 🆕 **<1 hour old:** +10 points (very fresh)
- ✨ **<24 hours old:** +5 points (fresh)

### Price Action
- 📈 **5min change >10%:** +10 points (pumping)
- 📉 **5min change <-10%:** -10 points (dumping)

### Liquidity Check
- ⚠️ **<$10K liquidity:** -15 points (hard to exit)

## 🤖 AI Thesis (If API Key Configured)

When `ANTHROPIC_API_KEY` is set in `.env`, Claude generates a detailed thesis:

```
🟢 TRADE THESIS 🟢

**RECOMMENDATION:** BUY

**THESIS:**
This token fits the perfect entry criteria with a $45K market cap and explosive
volume momentum (3.2x recent vs hourly average). Three other tracked whales
already holding suggests strong conviction from smart money.

**KEY FACTORS:**
✅ Market cap in sweet spot ($45K)
✅ Volume heating up significantly
✅ 3 other whales holding (profit, gake, Pow)
⚠️ Very new token (<1 hour) - high volatility expected
⚠️ Moderate liquidity ($12K) - plan exit carefully

**EXIT PLAN:**
Take 50% profit at 2-3x, let rest ride with trailing stop at 50% from peak.
Cut losses if drops below entry -20% or if volume dies completely.

🤖 AI Generated
```

## 📋 Rule-Based Thesis (Fallback)

If no API key configured, bot uses rule-based scoring:

```
🟡 TRADE THESIS 🟡

**RECOMMENDATION:** WATCH

**QUICK ANALYSIS:**
✅ Market cap in sweet spot
🔥 Volume heating up
👀 2 other whale(s) holding
⚠️ Low liquidity (hard to exit)

**SCORE:** 62/100

**Market Cap:** $45.2K
**Volume Momentum:** high
**Other Whales:** 2 holding

📊 Rule Based
```

## 🎯 Recommendation Levels

- 🟢 **BUY (70-100 points):** Strong signals, good risk/reward
- 🟡 **WATCH (50-69 points):** Mixed signals, wait for confirmation
- 🔴 **SKIP (<50 points):** Poor setup, avoid

## 📱 How It Appears in Telegram

```
🪙 Token Transfer

Wallet: 🤑 profit
Tokens:
  • 700,167 TRUMP
Status: ✅ Success
Time: 1/22/2026, 8:45 AM

View on Solscan

━━━━━━━━━━━━━━━━━━━━

🟢 TRADE THESIS 🟢

[Full thesis here...]

🤖 AI Generated

[🛒 Buy 0.01 SOL] [🛒 Buy 0.05 SOL]
[🛒 Buy 0.1 SOL]  [🛒 Buy 0.5 SOL]
[💰 Custom Amount]
[📋 Copy Trade]
```

## ⚙️ Configuration

### Enable AI Thesis (Recommended)

Add to `.env`:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Get API key from: https://console.anthropic.com/

**Cost:** ~$0.02-0.05 per thesis (using Claude Sonnet 4.5)

### Rule-Based Only (Free)

Leave `ANTHROPIC_API_KEY` commented out or empty. Bot will use the built-in scoring algorithm.

## 🔍 What Gets Analyzed

For each token transfer alert, the system:

1. **Fetches metadata** from DexScreener
   - Market cap, price, liquidity
   - Volume (5min, 1H, 24H)
   - Price changes (5min, 1H, 24H)
   - Token age

2. **Scans all 74 tracked wallets**
   - Checks if any other whales hold this token
   - Lists holders with amounts

3. **Calculates score** (0-100)
   - Based on all criteria
   - Generates recommendation

4. **Generates thesis**
   - AI: Detailed analysis with reasoning
   - Rule-based: Quick bullet-point summary

## 🚀 Future Enhancements

Next steps (ready for when you want to enable):

1. **Auto-buy based on thesis**
   - Set threshold (e.g., only BUY recommendations >80 score)
   - Configure max buy amount
   - Auto-execute without clicking

2. **Sell recommendations**
   - Monitor held tokens
   - Alert when thesis changes to SELL
   - Auto-sell based on exit plan

3. **Performance tracking**
   - Track thesis accuracy
   - Compare AI vs rule-based performance
   - Adjust criteria based on results

## 📝 Technical Details

**New Modules:**

1. **`/root/src/token-analyzer.js`**
   - Fetches token metadata from DexScreener
   - Analyzes volume trends
   - Finds other whales holding token
   - Calculates scoring

2. **`/root/src/trade-thesis-agent.js`**
   - Integrates with Claude API
   - Generates detailed thesis
   - Formats for Telegram display
   - Falls back to rule-based if no API key

**Integration:** Thesis is generated automatically for every `TOKEN_TRANSFER` alert before sending to Telegram.

## 🐛 Troubleshooting

**"Anthropic API key not found"**
- Add `ANTHROPIC_API_KEY` to `.env` file
- Restart bot
- Rule-based thesis will work without it

**"Could not fetch token metadata"**
- DexScreener might be rate-limiting
- Very new tokens might not be indexed yet
- Alert still sent, just without thesis

**"No other whales detected"**
- This is informational, not an error
- Means you're early (good or bad depending on other signals)

## 💡 Usage Tips

1. **Trust the scoring** - It's based on proven degen criteria
2. **Watch for confluence** - Best setups have multiple positive signals
3. **Don't ignore risks** - Every thesis lists risk factors
4. **Volume is key** - Low volume = hard to exit
5. **Market cap matters** - $30K-$300K is the sweet spot for 10-100x potential

## 📊 Example Analysis Workflow

```
🔔 Alert: profit bought NEWTOKEN
     ↓
🤖 Bot analyzes token
     ↓
✅ Market cap: $55K (in range)
✅ Volume: 3.5x recent vs 1H
✅ Other whales: gake, Pow holding
⚠️ Liquidity: $8K (watch out)
     ↓
🎯 Score: 72/100 → BUY recommendation
     ↓
🤖 Claude generates detailed thesis
     ↓
📱 Thesis sent to Telegram with buy buttons
     ↓
👆 You decide: Click buy or skip
```

## ✅ Current Status

- ✅ Bot running with thesis generation
- ✅ Monitoring 74 wallets
- ✅ Rule-based scoring active
- 💤 AI thesis generation: Waiting for API key
- ⏳ Ready for first thesis when next token transfer occurs

**Next alert will include thesis!**
