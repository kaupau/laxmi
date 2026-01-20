# laxmi
Solana Wallet Tracker - Real-time monitoring, alerts, and transaction analysis

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
- 🎯 Custom alert filters and rules
- 📊 Balance change tracking

### Transaction Details
- 💸 SOL balance changes per transaction
- 🪙 Token transfer detection and parsing
- 📈 Account-level balance tracking
- ⚡ Transaction success/failure status
- 🔗 Pre/post balance analysis

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

## Documentation

- **[API.md](./API.md)** - Complete API reference with input/output specs
- **[EXTENSIONS.md](./EXTENSIONS.md)** - Advanced patterns, integrations, and workflows
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

# Optional: Webhook URLs
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
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
