# 🚀 Quick Start Guide

## Paper Trading - How It Works

### No Database Required!

Paper trading stores everything in a **simple JSON file**: `paper-trades.json`

**Why JSON instead of a database?**
- ✅ Simple - No setup, no migrations, no query language
- ✅ Portable - Copy the file, backup is easy
- ✅ Human-readable - You can edit it directly if needed
- ✅ Fast - No network calls, no connection pooling
- ✅ Lightweight - No database service to run/maintain

### Data Storage Location

```
/root/
├── paper-trades.json    ← Your paper trading portfolio (created on first use)
├── wallets.json         ← 74 tracked whale addresses
└── .env                 ← API keys and config
```

### Paper Trading Data Structure

When you enable paper trading for the first time, it creates `paper-trades.json`:

```json
{
  "enabled": true,
  "balance": 1.0,
  "tokens": {
    "kh35nyno...pump": {
      "symbol": "BONK",
      "amount": 1000000,
      "avgPrice": 0.0001,
      "totalCost": 0.1,
      "firstBought": "2026-01-26T12:00:00.000Z"
    }
  },
  "trades": [
    {
      "type": "BUY",
      "tokenMint": "kh35nyno...pump",
      "symbol": "BONK",
      "amountSOL": 0.1,
      "tokensReceived": 1000000,
      "pricePerToken": 0.0001,
      "timestamp": "2026-01-26T12:00:00.000Z",
      "balanceAfter": 0.9
    }
  ],
  "stats": {
    "totalTrades": 1,
    "wins": 0,
    "losses": 0,
    "totalProfit": 0,
    "startingBalance": 1.0
  }
}
```

### How It Works (Step-by-Step)

1. **You enable paper trading:**
   ```
   /mode  → Paper trading enabled
   ```

2. **Alert arrives with a token:**
   - Bot detects whale bought BONK
   - AI generates thesis: "BUY (Score: 85/100)"
   - Buy buttons appear

3. **You click "Buy 0.1 SOL":**
   ```javascript
   // Bot checks: paperTrading.isEnabled() → true
   // Fetches current BONK price from DexScreener
   price = $0.0001 per token

   // Calculates tokens received
   tokens = 0.1 SOL / $0.0001 = 1,000,000 BONK

   // Updates paper-trades.json:
   balance: 1.0 → 0.9
   tokens: { "BONK": 1,000,000 }
   trades: [{ type: "BUY", ... }]

   // Saves to disk
   fs.writeFileSync('paper-trades.json', JSON.stringify(data))
   ```

4. **Check your portfolio:**
   ```
   /portfolio
   → SOL Balance: 0.9 SOL
   → BONK: 1,000,000 tokens (Cost: 0.1 SOL)
   → Total Value: 0.95 SOL
   → Total Return: -5%
   ```

5. **Data persists:**
   - Bot restarts? Your portfolio is still there
   - Computer restarts? Data saved on disk
   - Want to backup? Just copy `paper-trades.json`

### Switching Between Modes

**Paper Trading (Safe):**
```
/mode  → Enabled
[Click buy] → Updates paper-trades.json (no real money)
```

**Real Trading (Live):**
```
/mode  → Disabled
[Click buy] → Executes real Jupiter swap (uses real SOL!)
```

The same buy buttons work for both modes - bot checks `paperTrading.isEnabled()` to decide.

### Backup Your Data

```bash
# Backup your paper trading portfolio
cp paper-trades.json paper-trades-backup.json

# Restore from backup
cp paper-trades-backup.json paper-trades.json
```

### Reset Paper Account

```
/reset
→ Deletes all tokens
→ Resets balance to 1.0 SOL
→ Clears trade history
→ Resets stats
```

### Want More Starting Money?

Edit `paper-trades.json` directly:

```json
{
  "balance": 10.0,
  "stats": {
    "startingBalance": 10.0
  }
}
```

Or just `/reset` multiple times (1 SOL each time).

---

## 🤖 Bot Commands

### Essential
```
/start      - Initialize bot
/status     - View current status
/mode       - Toggle paper/real trading ⭐
/portfolio  - View paper portfolio
```

### Wallet Info
```
/wallets    - List all 74 tracked wallets
/balance    - Check wallet balance
/activity   - Recent transactions
```

### Bot Wallet (Real Trading)
```
/wallet     - Show bot wallet address
/deposit    - Get deposit address
```

---

## 📊 Quick Test

1. **Start bot** (already running! ✅)

2. **Enable paper trading:**
   - Open Telegram
   - Send `/mode` to bot
   - Bot confirms: "🧪 Paper Trading ENABLED"

3. **Wait for alert** (bot checks every 60 seconds)

4. **Click buy button** when alert arrives

5. **Check portfolio:**
   - Send `/portfolio`
   - See your simulated holdings

6. **Track over time:**
   - Wait for prices to change
   - Check `/portfolio` again
   - See P&L update

7. **Go live when ready:**
   - Send `/mode` again
   - Bot switches to real trading
   - Buy buttons now execute real swaps

---

## 🔥 Common Questions

**Q: Does paper trading use real prices?**
A: Yes! Fetches live prices from DexScreener API.

**Q: What if I restart the bot?**
A: Your portfolio loads from `paper-trades.json` automatically.

**Q: Can I see my trade history?**
A: Yes, it's stored in `paper-trades.json` under the "trades" array.

**Q: How do I delete everything and start over?**
A: Just delete `paper-trades.json` or use `/reset` command.

**Q: Can I manually edit the JSON?**
A: Yes! The file is human-readable. Just be careful with the format.

**Q: What happens if the JSON gets corrupted?**
A: Bot will create a fresh one with default values on next start.

---

## 🎯 Pro Tips

1. **Test first, always** - Use paper trading for at least 1 week before going live

2. **Track your thesis accuracy** - Which AI scores (70+, 80+, 90+) are most accurate?

3. **Compare to real trades** - Did paper results match what would have happened?

4. **Be realistic** - Paper trading doesn't have slippage or failed transactions

5. **Follow your strategy** - Don't FOMO into every alert, stick to your rules

6. **Backup regularly** - Copy `paper-trades.json` weekly to track progress

---

## 📁 Files You Care About

```
/root/
├── telegram-bot.js          ← Main bot (currently running)
├── paper-trades.json        ← Your paper portfolio
├── wallets.json             ← 74 whale addresses
├── .env                     ← API keys
│
├── src/
│   ├── paper-trading.js     ← Paper trading logic
│   ├── token-analyzer.js    ← Token analysis
│   ├── trade-thesis-agent.js ← AI thesis
│   └── jupiter-trader.js    ← Real swaps
│
└── docs/
    ├── PAPER_TRADING.md     ← Full paper trading guide
    └── TESTING.md           ← Test documentation
```

---

**Status: ✅ Bot is running and monitoring 74 wallets!**

Check logs: `tail -f /tmp/telegram-bot.log`
