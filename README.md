# laxmi
Solana Wallet Tracker - Real-time monitoring, alerts, transaction analysis, and automated trading

## Features

### Core Tracking
- 📊 Track multiple Solana wallets with custom names and emojis
- 💰 Get real-time SOL balances
- 📜 Fetch transaction history with detailed parsing
- 🔍 Deep transaction analysis (SOL transfers, token transfers, fees)
- 🤖 LLM-friendly output formatting

### Real-Time Monitoring
- 🔔 Real-time wallet monitoring with configurable polling
- 🚨 Alert system for transaction events
- 📮 Webhook support (Discord, Telegram, Slack, custom)
- 📱 Telegram alert bot with instant notifications
- 🎯 Custom alert filters and rules
- 📊 Balance change tracking

### Transaction Details
- 💸 SOL balance changes per transaction
- 🪙 Token transfer detection and parsing
- 📈 Account-level balance tracking
- ⚡ Transaction success/failure status
- 🔗 Pre/post balance analysis

### 🤖 Automated Trading (NEW!)
- 💼 Wallet creation and management
- 📤 Send SOL transactions
- 🔄 Copy trading bot framework
- 🐋 Whale follower strategies
- 🎯 Token sniping capabilities
- 🧪 Dry-run mode for safe testing
- ⚡ Event-driven trading triggers
- 📊 Trading statistics and history

### 🚀 Pigeon.trade Integration (NEW!)
- 📊 **Full Token Portfolio Tracking** - Track all SPL tokens with real USD values (not just SOL)
- 💰 **PnL Calculations** - Analyze realized profit/loss for each token across all trades
- 🐋 **Whale Detection** - Identify concentrated tokens and whale holder statistics
- 📈 **Market Intelligence** - Discover trending tokens before they pump
- 🧠 **Sentiment Analysis** - Track social sentiment and news mentions
- 🤖 **Jupiter Integration** - Execute swaps and manage limit orders
- 🎯 **Smart Alerts** - Get notified when whales buy trending tokens
- 💸 **Budget Management** - Control API costs with built-in spending limits

## Installation

```bash
npm install
```

## Usage

### Basic Example

```javascript
import { WalletTracker } from './src/tracker.js';

const tracker = new WalletTracker();
tracker.loadWallets();

// Get wallet info
const info = await tracker.getWalletInfo('whale');
console.log(info);

// Get LLM-friendly summary
const summary = await tracker.getWalletSummary('whale');
console.log(summary);

// Get all wallets summary
const allSummary = await tracker.getAllWalletsSummary();
console.log(allSummary);
```

### Run Example

```bash
npm start
```

### Run Tests

```bash
npm test
```

### Advanced Examples

```bash
npm run demo              # Live wallet data demo
npm run detailed-tx       # Detailed transaction parsing
npm run monitor           # Real-time wallet monitoring
npm run webhooks          # Webhook integration demo
npm run telegram-bot      # 🆕 Telegram alert bot
npm run wallet-setup      # 🆕 Create/manage wallets
npm run copy-trading      # 🆕 Copy trading bot (dry-run)
```

### Pigeon Integration (Enhanced Features)

```bash
# 1. Get Pigeon API key from https://pigeon.trade
# 2. Set environment variable
export PIGEON_API_KEY=your_key_here

# 3. Run enhanced demos
node examples/pigeon-demo.js      # Full portfolio & PnL tracking
node examples/ai-agent.js         # AI-powered wallet analysis
```

## Quick Start Examples

### 1. Basic Wallet Info

```javascript
import { WalletTracker } from './src/tracker.js';

const tracker = new WalletTracker();
tracker.loadWallets();

// Get info for a specific wallet
const info = await tracker.getWalletInfo('whale');
console.log(`${info.emoji} ${info.name}: ${info.balanceFormatted}`);
```

### 2. Real-Time Monitoring

```javascript
import { WalletMonitor, AlertType } from './src/alerts.js';

const monitor = new WalletMonitor(tracker, {
  pollInterval: 10000,              // Check every 10 seconds
  largeTransactionThreshold: 10     // Alert on 10+ SOL
});

// Listen for incoming transactions
monitor.on(AlertType.TRANSACTION_RECEIVED, (alert) => {
  console.log(`${alert.wallet.name} received ${alert.transaction.amount} SOL`);
});

await monitor.start();
```

### 3. Webhook Integration

```javascript
// Send alerts to Discord
monitor.registerWebhook({
  url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK',
  events: [AlertType.LARGE_TRANSACTION],
  wallets: ['whale', 'gremlin'],
  filters: { minAmount: 10 }
});
```

### 4. Detailed Transaction Analysis

```javascript
// Get detailed transaction information
const details = await tracker.getTransactionDetails(signature);

console.log(`Fee: ${details.fee} SOL`);
console.log(`SOL Changes:`, details.balanceChanges);
console.log(`Token Transfers:`, details.tokenTransfers);
```

### 5. Automated Trading

```javascript
import { WalletManager } from './src/wallet.js';
import { TradingBot, TradingStrategies } from './src/trading-bot.js';

// Create or load wallet
const walletManager = new WalletManager();
walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);

// Create trading bot
const bot = new TradingBot(tracker, walletManager, {
  enabled: false,        // Start paused
  dryRun: true,         // Simulate trades
  maxTradeAmount: 0.1,  // Max 0.1 SOL per trade
  copyRatio: 0.1        // Copy 10% of whale trades
});

// Register copy trading strategy
bot.registerStrategy('copy-whale',
  TradingStrategies.copyTrading('whale', {
    minAmount: 1  // Only copy trades >= 1 SOL
  })
);

await bot.start();
```

**⚠️ Trading Warnings:**
- Start with dry-run mode (simulated trades)
- Test on devnet before mainnet
- Use small amounts
- Trading involves financial risk
- See [TRADING.md](./TRADING.md) for complete guide

### 6. Enhanced Portfolio with Pigeon Integration

```javascript
import { EnhancedWalletTracker } from './src/enhanced-tracker.js';

const tracker = new EnhancedWalletTracker(
  process.env.RPC_URL,
  process.env.PIGEON_API_KEY,
  {
    pigeonOptions: {
      dailyBudget: 1.00,  // $1/day API budget
      cacheTimeout: 300000 // 5 min cache
    }
  }
);

tracker.loadWallets();

// Get full token portfolio (not just SOL)
const portfolio = await tracker.getTokenPortfolio('whale');
console.log(`Total Value: $${portfolio.totalUsdValue.toFixed(2)}`);
console.log(`Tokens: ${portfolio.tokens.length}`);

// Calculate realized PnL
const pnl = await tracker.getCompletePnL('whale');
console.log(`Total PnL: ${pnl.totalRealizedPnL.toFixed(4)} SOL`);
console.log(`Win Rate: ${pnl.winRate.toFixed(1)}%`);

// Discover trending tokens
const trending = await tracker.discoverTrendingTokens('solana', 10);
console.log('Top trending:', trending.map(t => t.symbol));

// Detect smart money moves
const smartMoves = await tracker.detectTrendingPurchases('whale');
console.log(`Trending purchases: ${smartMoves.count}`);
```

**See [PIGEON_INTEGRATION.md](./PIGEON_INTEGRATION.md) for complete integration guide**

## Trading Features

### Wallet Management

```bash
# Create a new wallet
npm run wallet-setup

# Save your private key to .env
echo "WALLET_PRIVATE_KEY=your_key_here" >> .env
```

### Copy Trading Bot

```bash
# Run in dry-run mode (simulated)
npm run copy-trading

# Bot will monitor and simulate trades based on tracked wallets
```

### Trading Strategies

- **Copy Trading**: Mirror trades from whale wallets
- **Whale Follower**: Trade when large transactions occur
- **Token Sniper**: Buy tokens when tracked wallets buy them
- **Custom Strategies**: Build your own trading logic

See [TRADING.md](./TRADING.md) for detailed documentation and examples.

## API Reference

### WalletTracker

Core wallet tracking and analysis.

#### Basic Methods

- `loadWallets(configPath)` - Load wallets from JSON config
- `getWalletByName(name)` - Find wallet by name
- `getBalance(address)` - Get SOL balance for address
- `getWalletInfo(nameOrAddress)` - Get detailed wallet info
- `getAllWalletsInfo()` - Get info for all tracked wallets
- `getWalletSummary(nameOrAddress)` - Get LLM-friendly summary
- `getAllWalletsSummary()` - Get summary of all wallets
- `getTransactionHistory(nameOrAddress, limit)` - Get recent transactions

#### Advanced Methods

- `getRecentTransactions(address, limit)` - Get transaction signatures
- `getTransactionDetails(signature)` - Get detailed transaction info including:
  - SOL balance changes per account
  - Token transfers with amounts
  - Transaction fees and status
  - Pre/post balances for all accounts
- `getDetailedTransactionHistory(nameOrAddress, limit)` - Get transactions with full details
- `getTransactionSummary(signature)` - Get LLM-friendly transaction summary

### WalletMonitor

Real-time wallet monitoring and alerts.

#### Constructor

```javascript
new WalletMonitor(tracker, {
  pollInterval: 10000,              // Polling interval in ms
  largeTransactionThreshold: 10     // SOL amount for large tx alerts
})
```

#### Methods

- `start()` - Start monitoring wallets
- `stop()` - Stop monitoring
- `registerWebhook(config)` - Register webhook for alerts
- `addFilter(walletName, filterFn)` - Add custom alert filter
- `getStats()` - Get monitoring statistics

#### Events

- `alert` - All alerts
- `TRANSACTION_RECEIVED` - Incoming transaction
- `TRANSACTION_SENT` - Outgoing transaction
- `BALANCE_CHANGE` - Balance changed
- `TOKEN_TRANSFER` - Token transfer detected
- `LARGE_TRANSACTION` - Large transaction (above threshold)
- `error` - Monitoring error

### AlertLogger

Simple alert logging utility.

#### Methods

- `log(alert)` - Log an alert
- `getAlerts()` - Get all logged alerts
- `clear()` - Clear alert log

## Configuration

Wallets are configured in `wallets.json`. Each wallet has:

- `trackedWalletAddress` - Solana wallet address
- `name` - Friendly name
- `emoji` - Display emoji
- `alertsOnToast`, `alertsOnBubble`, `alertsOnFeed` - Alert settings
- `groups` - Wallet groups
- `sound` - Alert sound

## LLM Integration

The tracker is designed to be LLM-friendly with methods that return formatted strings perfect for AI assistants:

```javascript
// Get quick summary
const summary = await tracker.getWalletSummary('whale');
// Returns: "🐳 whale: 123.4567 SOL (HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp)"

// Get all wallets overview
const allSummary = await tracker.getAllWalletsSummary();
// Returns formatted text with all wallets and total balance
```

## Alert Types

The monitoring system supports these alert types:

- `TRANSACTION_RECEIVED` - Incoming SOL or token transfer
- `TRANSACTION_SENT` - Outgoing SOL or token transfer
- `BALANCE_CHANGE` - Wallet balance changed
- `TOKEN_TRANSFER` - Token activity detected
- `LARGE_TRANSACTION` - Transaction above threshold
- `NEW_TRANSACTION` - Any new transaction

## Webhook Integration

Supports webhooks for Discord, Telegram, Slack, and custom endpoints:

```javascript
monitor.registerWebhook({
  url: 'YOUR_WEBHOOK_URL',
  events: [AlertType.LARGE_TRANSACTION, AlertType.TOKEN_TRANSFER],
  wallets: ['whale', 'gremlin'],  // or 'all'
  filters: {
    minAmount: 10  // Minimum SOL amount
  },
  headers: {
    'Authorization': 'Bearer TOKEN'  // Optional
  }
});
```

### Webhook Payload

```json
{
  "type": "TRANSACTION_RECEIVED",
  "timestamp": "2026-01-20T09:34:19.000Z",
  "wallet": {
    "address": "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
    "name": "whale",
    "emoji": "🐳"
  },
  "transaction": {
    "signature": "2GvgQi9NGemVDdJ7X6ti...",
    "amount": 24.41,
    "success": true,
    "fee": 0.000005,
    "balanceChanges": {...},
    "tokenTransfers": [...]
  }
}
```

### Telegram Alert Bot

Get instant Telegram notifications when your tracked wallets have activity.

#### Quick Setup

1. **Create a Telegram bot:**
   - Message @BotFather on Telegram
   - Send `/newbot` and follow the prompts
   - Save the bot token

2. **Get your Chat ID:**
   - Message @userinfobot on Telegram
   - Save your user ID

3. **Configure `.env`:**
   ```bash
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   TELEGRAM_OWNER_ID=123456789
   ```

4. **Start the bot:**
   ```bash
   npm run telegram-bot
   ```

5. **Activate in Telegram:**
   - Send `/start` to your bot
   - You'll now receive real-time alerts!

#### Alert Types

- 🚨 Large transactions (>10 SOL)
- 💰 Incoming transactions
- 📤 Outgoing transactions
- 🪙 Token transfers
- 📊 Balance changes

#### Bot Commands

- `/start` - Activate alerts
- `/status` - View monitoring status
- `/wallets` - List tracked wallets
- `/stats` - Show statistics
- `/help` - Command list

**See [TELEGRAM_BOT.md](./TELEGRAM_BOT.md) for complete setup guide and customization options.**

## Documentation

- **[API.md](./API.md)** - Complete API reference with input/output specs
- **[PIGEON_INTEGRATION.md](./PIGEON_INTEGRATION.md)** - 🚀 Pigeon.trade integration guide for enhanced features
- **[EXTENSIONS.md](./EXTENSIONS.md)** - Advanced patterns, integrations, and workflows
- **[TRADING.md](./TRADING.md)** - 🆕 Trading bot guide, wallet management, and strategies
- **[TELEGRAM_BOT.md](./TELEGRAM_BOT.md)** - 🆕 Telegram alert bot setup and customization
- **[AGENTS.md](./AGENTS.md)** - 🤖 AI agent integration guide (also: [CLAUDE.md](./CLAUDE.md))
- **[examples/](./examples/)** - Working code examples

## Use Cases

- 🐋 **Whale Watching** - Track large holder wallets
- 🤖 **Copy Trading** - Monitor and replicate trader actions
- 📊 **Portfolio Analytics** - Track wallet performance over time
- 🔔 **Smart Alerts** - Get notified of important transactions
- 🔗 **Integration** - Connect to Discord, Telegram, APIs
- 🧠 **AI Analysis** - Feed transaction data to LLMs for insights

## Project Structure

```
laxmi/
├── src/
│   ├── tracker.js           # Core wallet tracking
│   ├── alerts.js            # Monitoring and alerts
│   ├── example.js           # Basic usage examples
│   └── tracker.test.js      # Test suite
├── examples/
│   ├── detailed-transactions.js  # Transaction analysis
│   ├── monitor-wallets.js        # Real-time monitoring
│   ├── webhook-demo.js           # Webhook integration
│   └── quick-test.js            # Feature testing
├── wallets.json             # Wallet configuration
├── API.md                   # API documentation
├── EXTENSIONS.md            # Advanced guides
└── README.md                # This file
```

## Environment Variables

```bash
# Optional: Premium RPC for better performance
SOLANA_RPC_URL=https://your-premium-rpc.com

# Optional: Pigeon.trade API for enhanced features
PIGEON_API_KEY=your_pigeon_api_key

# Optional: Anthropic API for AI agents
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Webhook URLs
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_OWNER_ID=your_owner_id
CUSTOM_WEBHOOK_URL=https://your-server.com/webhook
WEBHOOK_TOKEN=your_secret_token
```

## Performance Tips

1. **Use Premium RPC** - Free endpoints have strict rate limits
2. **Cache Results** - Implement caching for frequently accessed data
3. **Adjust Poll Interval** - Balance between real-time and API usage
4. **Batch Requests** - Group RPC calls when possible
5. **Use WebSockets** - Consider WebSocket subscriptions for real-time updates

## Contributing

Contributions welcome! Please read the API documentation before submitting PRs.

## License

MIT
