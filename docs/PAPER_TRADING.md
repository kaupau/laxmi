# Paper Trading Feature

## Overview

Paper trading allows you to test trading strategies without risking real money. All trades are simulated and tracked in a virtual portfolio.

## Features

✅ **Simulated Trading** - Execute trades without spending real SOL
✅ **Portfolio Tracking** - Track SOL balance and token holdings
✅ **Performance Stats** - Win rate, total return, P&L tracking
✅ **Persistent Storage** - Portfolio saved between bot restarts
✅ **Easy Toggle** - Switch between paper and real trading instantly

## Quick Start

### 1. Enable Paper Trading

```
/mode
```

This toggles paper trading on/off. When enabled:
- All buy buttons execute simulated trades
- No real money is spent
- You start with 1.0 SOL virtual balance

### 2. View Your Portfolio

```
/portfolio
```

Shows:
- Current SOL balance
- All token holdings with avg price and cost basis
- Performance metrics (total return, win rate, etc.)

### 3. Reset Your Account

```
/reset
```

Resets your paper trading account to initial state:
- Balance: 1.0 SOL
- All tokens: Sold
- Stats: Cleared

## How It Works

### Paper Trading Mode (Enabled)

When you click a buy button on an alert:

1. Bot fetches current token price from DexScreener
2. Calculates how many tokens you'd receive
3. Deducts SOL from your virtual balance
4. Adds tokens to your virtual portfolio
5. Updates your trade history and stats

**Example:**
```
You have: 1.0 SOL
You click: "Buy 0.1 SOL"
Token price: $0.001

Result:
- SOL Balance: 0.9 SOL
- Tokens received: 100 tokens
- Trade recorded in history
```

### Real Trading Mode (Disabled)

When paper trading is OFF:

1. Bot executes actual Jupiter swap
2. Real SOL is spent from your bot wallet
3. Real tokens are received
4. Transaction recorded on blockchain

## Commands

| Command | Description |
|---------|-------------|
| `/mode` | Toggle paper/real trading |
| `/portfolio` | View paper portfolio |
| `/reset` | Reset paper account |
| `/status` | View current trading mode |

## Portfolio Management

### Viewing Holdings

```
/portfolio
```

Shows detailed breakdown:
```
📊 Paper Trading Portfolio

💰 SOL Balance: 0.7000 SOL

🪙 Token Holdings:
  • BONK: 1,500,000 tokens
    Avg Price: $0.00000025
    Cost: 0.1500 SOL

  • SAMO: 50,000 tokens
    Avg Price: $0.00000400
    Cost: 0.1500 SOL

📈 Performance:
• Total Value: 0.95 SOL
• Total Return: -0.05 SOL (-5.00%)
• Total Trades: 2
• Win Rate: 0%
• Wins/Losses: 0/0
```

### Multiple Buys (Cost Averaging)

If you buy the same token multiple times, the system tracks:
- **Total amount**: Sum of all purchases
- **Average price**: Weighted average of all buys
- **Total cost**: Sum of SOL spent

**Example:**
```
Buy #1: 0.1 SOL at $0.001 = 100 tokens
Buy #2: 0.2 SOL at $0.002 = 100 tokens

Result:
- Total: 200 tokens
- Avg Price: $0.0015 [(0.1+0.2)/200]
- Cost: 0.3 SOL
```

### Selling Positions

Currently, paper trading only supports **buying** through the bot interface. To simulate sells, you would need to:

1. Track your holdings via `/portfolio`
2. Manually calculate P&L based on current prices
3. Use `/reset` to start fresh

**Future Enhancement**: Sell buttons and auto-sell based on thesis changes.

## Performance Tracking

### Stats Explained

- **Total Value**: Current SOL + (tokens × current price)
- **Total Return**: Total Value - Starting Balance
- **Return %**: (Total Return / Starting Balance) × 100
- **Win Rate**: (Wins / Total Sells) × 100
- **Wins/Losses**: Trades that made/lost money

### Trade History

Every trade is recorded with:
- Type (BUY/SELL)
- Token mint address and symbol
- Amount (SOL or tokens)
- Price at execution
- Timestamp
- Balance after trade

Access via `paperTrading.getHistory(10)` in code.

## Use Cases

### 1. Strategy Testing

Test your trading strategy before going live:

```bash
# Enable paper trading
/mode

# Wait for alerts, execute trades
# Track performance over days/weeks
/portfolio

# Analyze results
# If profitable, switch to real trading
/mode
```

### 2. Learning the Bot

New users can practice without risk:
- Learn how buy buttons work
- Understand thesis recommendations
- See how portfolio changes over time

### 3. Comparing Strategies

Run multiple paper trading sessions:
```bash
# Session 1: Follow all BUY recommendations
/mode
[Execute trades for 1 week]
/portfolio  # Record stats
/reset

# Session 2: Only follow BUY with score >80
/mode
[Execute selective trades for 1 week]
/portfolio  # Compare with Session 1
```

## Technical Details

### Data Storage

Paper trading data is stored in `paper-trades.json`:

```json
{
  "enabled": true,
  "balance": 0.7,
  "tokens": {
    "kh35nynonqA4VYaoeAvn17ChrhMrWhJ26EbCayKpump": {
      "symbol": "TEST",
      "amount": 100,
      "avgPrice": 0.0015,
      "totalCost": 0.3,
      "firstBought": "2026-01-25T10:30:00.000Z"
    }
  },
  "trades": [...],
  "stats": {
    "totalTrades": 2,
    "wins": 0,
    "losses": 0,
    "totalProfit": 0,
    "startingBalance": 1.0
  }
}
```

### Price Data Source

Token prices come from DexScreener API:
- Real-time market prices
- Same data used for AI thesis generation
- Falls back to $0.0001 if API fails

### Integration with Bot

Paper trading integrates seamlessly:
1. Alert arrives with token transfer
2. Thesis generated (same for both modes)
3. Buy buttons shown
4. User clicks button
5. Bot checks `paperTrading.isEnabled()`
6. Executes paper or real trade accordingly

## Limitations

### Current Limitations

❌ **No selling via bot** - Can only buy, not sell
❌ **No price tracking** - Portfolio value not updated automatically
❌ **No auto-trading** - Still requires manual button clicks
❌ **No stop-loss/take-profit** - No automated risk management

### Future Enhancements

Planned features:
- ✨ Sell buttons in portfolio view
- ✨ Auto-sell based on thesis changes
- ✨ Stop-loss and take-profit orders
- ✨ Performance charts and analytics
- ✨ Paper vs real trading comparison
- ✨ Multiple paper accounts (different strategies)

## Best Practices

### 1. Start with Paper Trading

Always test first:
```bash
/mode  # Enable paper trading
# Test for at least 1 week
# Review portfolio and stats
# Only switch to real if consistently profitable
```

### 2. Track Your Results

Keep notes on what works:
- Which thesis recommendations are accurate?
- What market cap range performs best?
- Do whale signals improve win rate?

### 3. Be Realistic

Paper trading differs from real:
- No slippage simulation
- Prices are estimates
- No failed transactions
- Always gets filled instantly

### 4. Don't Over-Trade

Even with paper money:
- Follow a strategy
- Don't FOMO into every alert
- Practice discipline

## FAQ

**Q: Does paper trading affect real trades?**
A: No. When paper trading is enabled, ALL buy buttons are simulated. No real money is ever spent.

**Q: Can I run both paper and real simultaneously?**
A: No. It's one mode at a time. Use `/mode` to toggle.

**Q: What happens to my paper portfolio when I disable paper trading?**
A: It's preserved. When you re-enable paper trading, your portfolio will be exactly as you left it.

**Q: How do I get more paper money?**
A: Use `/reset` to reset your account to 1.0 SOL. Or manually edit `paper-trades.json` (advanced).

**Q: Can I paper trade without the Anthropic API key?**
A: Yes! Paper trading works independently. You'll still get rule-based thesis instead of AI thesis.

**Q: Is there a risk of accidentally spending real money?**
A: Check `/status` before trading. If it says "🧪 Paper Trading", you're safe. If "💰 Real Trading", trades are real.

## Examples

### Example Session

```bash
# 1. Enable paper trading
/mode
> 🧪 Paper Trading ENABLED
> Starting Balance: 1.0000 SOL

# 2. Wait for alert
[Alert arrives: profit bought BONK]
[Thesis: BUY (Score: 75/100)]

# 3. Click "Buy 0.1 SOL"
> 🧪 Executing Paper Trade
> ✅ Paper Trade Executed!
> Input: 0.1 SOL
> Output: 1,000,000 BONK
> SOL Balance: 0.9000 SOL

# 4. Check portfolio
/portfolio
> 💰 SOL Balance: 0.9000 SOL
> 🪙 Token Holdings:
>   • BONK: 1,000,000 tokens
>     Cost: 0.1000 SOL

# 5. After a week, check performance
/portfolio
> Total Value: 1.2000 SOL
> Total Return: +0.2000 SOL (20.00%)
> Win Rate: 100%

# 6. Switch to real trading
/mode
> ⚠️ WARNING: Buy buttons will now execute REAL trades
```

## Troubleshooting

**Problem**: Can't view portfolio
**Solution**: Make sure paper trading is enabled first with `/mode`

**Problem**: Balance shows 0.0000 SOL
**Solution**: Use `/reset` to reset account to 1.0 SOL

**Problem**: Trades not being recorded
**Solution**: Check `paper-trades.json` exists and is writable

**Problem**: Want to test with more than 1 SOL
**Solution**: Use `/reset` multiple times or edit `paper-trades.json`:
```json
{
  "balance": 10.0,
  "stats": {
    "startingBalance": 10.0
  }
}
```

## API Reference

For developers:

```javascript
import { PaperTrading } from './src/paper-trading.js';

const pt = new PaperTrading('./paper-trades.json');

// Enable/disable
pt.toggle(); // Returns new state (true/false)
pt.isEnabled(); // Check current state

// Execute trades
await pt.buy(tokenMint, symbol, amountSOL, pricePerToken);
await pt.sell(tokenMint, tokenAmount, pricePerToken);

// View data
pt.getPortfolio(); // { balance, tokens, stats, totalValue }
pt.getStats(); // Detailed performance stats
pt.getHistory(10); // Last 10 trades

// Reset
pt.reset(initialBalance); // Default: 1.0 SOL
```

See `src/paper-trading.js` for full API documentation.
