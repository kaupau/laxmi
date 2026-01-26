# Laxmi Wallet Tracker - Extensions Guide

Advanced patterns for alerts, monitoring, and custom workflows.

---

## Table of Contents

1. [Real-Time Monitoring](#real-time-monitoring)
2. [Alert System](#alert-system)
3. [Webhook Integration](#webhook-integration)
4. [Custom Workflows](#custom-workflows)
5. [Integration Examples](#integration-examples)
6. [Performance Optimization](#performance-optimization)

---

## Real-Time Monitoring

### Basic Monitor Setup

```javascript
import { WalletTracker } from './src/tracker.js';
import { WalletMonitor, AlertLogger } from './src/alerts.js';

// Initialize tracker
const tracker = new WalletTracker();
tracker.loadWallets();

// Create monitor
const monitor = new WalletMonitor(tracker, {
  pollInterval: 10000,              // Check every 10 seconds
  largeTransactionThreshold: 10     // Alert on 10+ SOL transactions
});

// Set up alert logger
const logger = new AlertLogger('./alerts.log');

// Listen to all alerts
monitor.on('alert', (alert) => {
  logger.log(alert);
});

// Start monitoring
await monitor.start();
```

### Monitor Specific Alert Types

```javascript
import { AlertType } from './src/alerts.js';

// Listen for specific events
monitor.on(AlertType.TRANSACTION_RECEIVED, (alert) => {
  console.log(`💰 ${alert.wallet.name} received ${alert.transaction.amount} SOL`);
});

monitor.on(AlertType.LARGE_TRANSACTION, (alert) => {
  console.log(`🚨 LARGE TRANSACTION: ${alert.wallet.name}`);
  // Send urgent notification
  sendUrgentAlert(alert);
});

monitor.on(AlertType.TOKEN_TRANSFER, (alert) => {
  console.log(`🪙 Token activity on ${alert.wallet.name}`);
});
```

---

## Alert System

### Alert Structure

All alerts follow this structure:

```javascript
{
  type: 'TRANSACTION_RECEIVED' | 'TRANSACTION_SENT' | 'BALANCE_CHANGE' | 'TOKEN_TRANSFER' | 'LARGE_TRANSACTION',
  timestamp: '2026-01-20T09:34:19.000Z',
  wallet: {
    address: 'HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp',
    name: 'whale',
    emoji: '🐳'
  },
  transaction?: {
    signature: '2GvgQi9NGemVDdJ7X6ti...',
    slot: 123456789,
    success: true,
    fee: 0.000005,
    amount: 24.41,              // SOL amount
    balanceChanges: {...},
    tokenTransfers: [...]
  },
  balance?: {
    old: 323.1062,
    new: 347.5164,
    change: 24.41
  }
}
```

### Custom Alert Filters

```javascript
// Only alert if transaction is > 50 SOL
monitor.addFilter('whale', (alert) => {
  if (alert.transaction && alert.transaction.amount < 50) {
    return false; // Don't alert
  }
  return true; // Alert
});

// Only alert during business hours
monitor.addFilter('good_trader', (alert) => {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 17;
});

// Complex filter
monitor.addFilter('sniper', (alert) => {
  // Only alert on incoming transactions with tokens
  return alert.type === 'TRANSACTION_RECEIVED' &&
         alert.transaction.tokenTransfers.length > 0;
});
```

---

## Webhook Integration

### Register Webhooks

```javascript
// Discord webhook
monitor.registerWebhook({
  url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK',
  events: [AlertType.TRANSACTION_RECEIVED, AlertType.LARGE_TRANSACTION],
  wallets: ['whale', 'gremlin'],  // Specific wallets
  filters: {
    minAmount: 10  // Only transactions >= 10 SOL
  }
});

// Multiple webhooks
monitor.registerWebhook({
  url: 'https://your-server.com/alerts',
  events: [AlertType.TOKEN_TRANSFER],
  wallets: 'all',  // All wallets
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
```

### Discord Integration Example

```javascript
monitor.on('alert', async (alert) => {
  const embed = {
    title: `${alert.wallet.emoji} ${alert.wallet.name} - ${alert.type}`,
    description: formatAlertDescription(alert),
    color: getAlertColor(alert.type),
    timestamp: alert.timestamp,
    fields: []
  };

  if (alert.transaction) {
    embed.fields.push({
      name: 'Signature',
      value: `[View on Solscan](https://solscan.io/tx/${alert.transaction.signature})`
    });

    if (alert.transaction.amount) {
      embed.fields.push({
        name: 'Amount',
        value: `${alert.transaction.amount.toFixed(4)} SOL`,
        inline: true
      });
    }
  }

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
});

function getAlertColor(type) {
  const colors = {
    TRANSACTION_RECEIVED: 0x00ff00,  // Green
    TRANSACTION_SENT: 0xff0000,      // Red
    LARGE_TRANSACTION: 0xffa500,     // Orange
    TOKEN_TRANSFER: 0x0099ff,        // Blue
    BALANCE_CHANGE: 0xffff00         // Yellow
  };
  return colors[type] || 0x808080;
}

function formatAlertDescription(alert) {
  if (alert.transaction) {
    return `Transaction: \`${alert.transaction.signature.substring(0, 20)}...\`\nAmount: **${alert.transaction.amount?.toFixed(4) || 'N/A'} SOL**`;
  }
  if (alert.balance) {
    return `Balance changed from ${alert.balance.old.toFixed(4)} to ${alert.balance.new.toFixed(4)} SOL`;
  }
  return 'Wallet activity detected';
}
```

### Telegram Integration Example

```javascript
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID';

monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
  const message = `
🚨 *LARGE TRANSACTION ALERT*

Wallet: ${alert.wallet.emoji} ${alert.wallet.name}
Amount: ${alert.transaction.amount.toFixed(4)} SOL
Time: ${new Date(alert.timestamp).toLocaleString()}

[View Transaction](https://solscan.io/tx/${alert.transaction.signature})
  `.trim();

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });
});
```

---

## Custom Workflows

### 1. Copy Trading Bot

Monitor whale wallets and execute similar trades:

```javascript
monitor.on(AlertType.TOKEN_TRANSFER, async (alert) => {
  if (alert.wallet.name === 'whale') {
    const tokenTransfers = alert.transaction.tokenTransfers;

    for (const transfer of tokenTransfers) {
      if (transfer.amount > 0) {
        // Whale bought a token
        console.log(`🐳 Whale bought token: ${transfer.mint}`);

        // Execute your buy order
        await executeBuyOrder(transfer.mint, YOUR_BUY_AMOUNT);
      }
    }
  }
});

async function executeBuyOrder(tokenMint, amount) {
  // Implement your trading logic here
  // This could use Jupiter, Raydium, or other DEX protocols
  console.log(`Executing buy order for ${tokenMint}: ${amount} SOL`);
}
```

### 2. Portfolio Tracker with Database

Log all transactions to a database for analytics:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

monitor.on('alert', async (alert) => {
  await supabase.from('wallet_alerts').insert({
    wallet_name: alert.wallet.name,
    wallet_address: alert.wallet.address,
    alert_type: alert.type,
    timestamp: alert.timestamp,
    transaction_signature: alert.transaction?.signature,
    amount: alert.transaction?.amount,
    balance_change: alert.balance?.change,
    metadata: alert
  });
});

// Query analytics
async function getWalletAnalytics(walletName, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('wallet_alerts')
    .select('*')
    .eq('wallet_name', walletName)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: false });

  return {
    totalTransactions: data.length,
    totalVolume: data.reduce((sum, d) => sum + (d.amount || 0), 0),
    incomingCount: data.filter(d => d.alert_type === 'TRANSACTION_RECEIVED').length,
    outgoingCount: data.filter(d => d.alert_type === 'TRANSACTION_SENT').length
  };
}
```

### 3. Smart Alerts with AI

Use LLM to analyze transactions and provide insights:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
  // Get transaction details
  const details = await tracker.getTransactionDetails(alert.transaction.signature);

  // Get wallet history for context
  const history = await tracker.getDetailedTransactionHistory(alert.wallet.name, 10);

  // Ask AI to analyze
  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this Solana transaction:

Wallet: ${alert.wallet.name}
Transaction: ${alert.transaction.signature}
Amount: ${alert.transaction.amount} SOL

Transaction Details:
${JSON.stringify(details, null, 2)}

Recent History:
${JSON.stringify(history.transactions.slice(0, 5), null, 2)}

What is this transaction likely doing? Is it notable?`
    }]
  });

  console.log(`\n🤖 AI Analysis for ${alert.wallet.name}:`);
  console.log(analysis.content[0].text);

  // Send to Discord with AI insights
  sendDiscordNotification({
    wallet: alert.wallet,
    transaction: alert.transaction,
    aiAnalysis: analysis.content[0].text
  });
});
```

### 4. Multi-Wallet Correlation

Detect when multiple tracked wallets interact:

```javascript
const recentAlerts = new Map(); // signature -> alert

monitor.on('alert', (alert) => {
  if (!alert.transaction) return;

  const sig = alert.transaction.signature;

  // Check if we've seen this transaction from another wallet
  if (recentAlerts.has(sig)) {
    const previousAlert = recentAlerts.get(sig);

    console.log(`\n🔗 CORRELATED TRANSACTION DETECTED:`);
    console.log(`${previousAlert.wallet.name} ↔️ ${alert.wallet.name}`);
    console.log(`Signature: ${sig}`);
    console.log(`This suggests these wallets may be related or interacting.`);

    // Send special alert
    sendCorrelationAlert(previousAlert, alert);
  }

  // Store this alert
  recentAlerts.set(sig, alert);

  // Clean up old alerts after 1 minute
  setTimeout(() => recentAlerts.delete(sig), 60000);
});
```

### 5. Performance Tracking

Track wallet profitability over time:

```javascript
class WalletPerformanceTracker {
  constructor(tracker) {
    this.tracker = tracker;
    this.positions = new Map(); // mint -> { entry, amount }
  }

  async trackPerformance(walletName) {
    const monitor = new WalletMonitor(this.tracker);

    monitor.on(AlertType.TOKEN_TRANSFER, async (alert) => {
      if (alert.wallet.name !== walletName) return;

      for (const transfer of alert.transaction.tokenTransfers) {
        if (transfer.amount > 0) {
          // Buy detected
          this.positions.set(transfer.mint, {
            entry: await this.getTokenPrice(transfer.mint),
            amount: transfer.amount,
            timestamp: alert.timestamp
          });
          console.log(`📈 Opened position: ${transfer.mint}`);
        } else {
          // Sell detected
          const position = this.positions.get(transfer.mint);
          if (position) {
            const exitPrice = await this.getTokenPrice(transfer.mint);
            const pnl = (exitPrice - position.entry) * position.amount;
            console.log(`📊 Closed position: ${transfer.mint}`);
            console.log(`   PnL: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} SOL`);
            this.positions.delete(transfer.mint);
          }
        }
      }
    });

    await monitor.start();
  }

  async getTokenPrice(mint) {
    // Implement price fetching (e.g., from Jupiter API)
    return 1.0; // Placeholder
  }
}
```

---

## Integration Examples

### Express.js API Server

Create a REST API for wallet data:

```javascript
import express from 'express';
import { WalletTracker } from './src/tracker.js';
import { WalletMonitor, AlertLogger } from './src/alerts.js';

const app = express();
const tracker = new WalletTracker();
tracker.loadWallets();

const monitor = new WalletMonitor(tracker);
const logger = new AlertLogger();

monitor.on('alert', (alert) => logger.log(alert));
monitor.start();

// Get all wallets
app.get('/api/wallets', async (req, res) => {
  const wallets = await tracker.getAllWalletsInfo();
  res.json(wallets);
});

// Get specific wallet
app.get('/api/wallets/:name', async (req, res) => {
  const info = await tracker.getWalletInfo(req.params.name);
  res.json(info);
});

// Get wallet transactions
app.get('/api/wallets/:name/transactions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = await tracker.getDetailedTransactionHistory(req.params.name, limit);
  res.json(history);
});

// Get recent alerts
app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(logger.getAlerts().slice(-limit));
});

// Get monitor stats
app.get('/api/monitor/stats', (req, res) => {
  res.json(monitor.getStats());
});

app.listen(3000, () => {
  console.log('API server running on http://localhost:3000');
});
```

### Scheduled Reports

Generate daily/weekly reports:

```javascript
import cron from 'node-cron';

// Daily report at 9 AM
cron.schedule('0 9 * * *', async () => {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  console.log('\n📊 DAILY WALLET REPORT\n');
  console.log('='.repeat(60));

  const summary = await tracker.getAllWalletsSummary();
  console.log(summary);

  // Get yesterday's activity
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const wallet of tracker.wallets) {
    const txs = await tracker.getRecentTransactions(wallet.trackedWalletAddress, 20);
    const recentTxs = txs.filter(tx =>
      tx.blockTime && new Date(tx.blockTime * 1000) > yesterday
    );

    if (recentTxs.length > 0) {
      console.log(`\n${wallet.emoji} ${wallet.name}: ${recentTxs.length} transactions`);
    }
  }

  // Email report
  await sendEmailReport(summary);
});
```

---

## Performance Optimization

### 1. Batch RPC Requests

Reduce RPC calls by batching:

```javascript
async function getBatchBalances(addresses) {
  const requests = addresses.map(addr => ({
    methodName: 'getBalance',
    args: [addr]
  }));

  const results = await connection._rpcBatchRequest(requests);
  return results.map(r => r.result.value / LAMPORTS_PER_SOL);
}
```

### 2. Caching Layer

Add Redis caching:

```javascript
import Redis from 'ioredis';

class CachedWalletTracker extends WalletTracker {
  constructor() {
    super();
    this.redis = new Redis();
    this.cacheTTL = 30; // 30 seconds
  }

  async getBalance(address) {
    const cached = await this.redis.get(`balance:${address}`);
    if (cached) {
      return parseFloat(cached);
    }

    const balance = await super.getBalance(address);
    await this.redis.setex(`balance:${address}`, this.cacheTTL, balance);
    return balance;
  }
}
```

### 3. WebSocket Subscriptions

Use WebSockets for real-time updates instead of polling:

```javascript
import { Connection } from '@solana/web3.js';

class WebSocketMonitor {
  constructor(tracker) {
    this.tracker = tracker;
    this.connection = new Connection(RPC_URL, {
      wsEndpoint: WS_ENDPOINT
    });
  }

  async start() {
    for (const wallet of this.tracker.wallets) {
      const pubkey = new PublicKey(wallet.trackedWalletAddress);

      // Subscribe to account changes
      this.connection.onAccountChange(pubkey, (accountInfo) => {
        console.log(`Balance changed for ${wallet.name}`);
        this.handleBalanceChange(wallet, accountInfo);
      });

      // Subscribe to logs (transactions)
      this.connection.onLogs(pubkey, (logs) => {
        console.log(`New transaction for ${wallet.name}`);
        this.handleTransaction(wallet, logs);
      });
    }
  }
}
```

### 4. Rate Limiting

Implement smart rate limiting:

```javascript
class RateLimitedTracker extends WalletTracker {
  constructor() {
    super();
    this.requestQueue = [];
    this.processing = false;
    this.requestsPerSecond = 10;
  }

  async queueRequest(fn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;

    this.processing = true;
    const interval = 1000 / this.requestsPerSecond;

    while (this.requestQueue.length > 0) {
      const { fn, resolve, reject } = this.requestQueue.shift();
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      await new Promise(r => setTimeout(r, interval));
    }

    this.processing = false;
  }

  async getBalance(address) {
    return this.queueRequest(() => super.getBalance(address));
  }
}
```

---

## Complete Example: Production Monitor

Here's a complete production-ready monitoring setup:

```javascript
import { WalletTracker } from './src/tracker.js';
import { WalletMonitor, AlertLogger, AlertType } from './src/alerts.js';

// Initialize
const tracker = new WalletTracker('https://your-premium-rpc.com');
tracker.loadWallets();

const monitor = new WalletMonitor(tracker, {
  pollInterval: 5000,
  largeTransactionThreshold: 10
});

const logger = new AlertLogger('./logs/alerts.log');

// Discord webhook
monitor.registerWebhook({
  url: process.env.DISCORD_WEBHOOK_URL,
  events: [AlertType.LARGE_TRANSACTION, AlertType.TOKEN_TRANSFER],
  wallets: 'all',
  filters: { minAmount: 5 }
});

// Custom filters
monitor.addFilter('whale', (alert) => {
  // Only alert on transactions > 50 SOL
  return !alert.transaction || alert.transaction.amount > 50;
});

// Event handlers
monitor.on('alert', (alert) => {
  logger.log(alert);
});

monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
  // Get AI analysis for large transactions
  const analysis = await analyzeWithAI(alert);
  console.log(`🤖 AI Analysis: ${analysis}`);
});

monitor.on('error', (error) => {
  console.error('Monitor error:', error);
  // Send error notification
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  monitor.stop();
  process.exit(0);
});

// Start monitoring
console.log('🚀 Starting production monitor...');
await monitor.start();
```

---

## Best Practices

1. **Use Premium RPC** - Free endpoints have strict rate limits
2. **Implement Error Handling** - Networks fail, handle it gracefully
3. **Add Logging** - Track all alerts and errors
4. **Use WebSockets** - More efficient than polling for real-time data
5. **Cache Aggressively** - Reduce redundant RPC calls
6. **Monitor Performance** - Track RPC usage and response times
7. **Secure Webhooks** - Validate webhook signatures when possible
8. **Test Alerts** - Verify notifications work before going live
9. **Rate Limit** - Respect RPC endpoint limits
10. **Backup Data** - Log alerts to database for historical analysis

---

For API reference, see [API.md](./API.md)
