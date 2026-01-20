# Laxmi Wallet Tracker - AI Agent Integration Guide

Complete guide for integrating the Laxmi Wallet Tracker with AI agents, LLMs, and autonomous systems.

---

## Table of Contents

1. [Quick Start for AI Agents](#quick-start-for-ai-agents)
2. [LLM-Friendly APIs](#llm-friendly-apis)
3. [Agent Use Cases](#agent-use-cases)
4. [Integration Patterns](#integration-patterns)
5. [Autonomous Trading Agents](#autonomous-trading-agents)
6. [Best Practices](#best-practices)

---

## Quick Start for AI Agents

The Laxmi tracker is designed to be easily consumed by AI agents with simple, text-based outputs perfect for LLM processing.

### Basic Wallet Query

```javascript
import { WalletTracker } from './src/tracker.js';

const tracker = new WalletTracker();
tracker.loadWallets();

// Simple question: "What is the whale's balance?"
const answer = await tracker.getWalletSummary('whale');
console.log(answer);
// Output: "🐳 whale: 347.5164 SOL (HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp)"
```

### Portfolio Overview

```javascript
// Question: "Show me all wallet balances"
const summary = await tracker.getAllWalletsSummary();
console.log(summary);
/* Output:
📊 Wallet Tracker Summary

🐳 whale: 347.5164 SOL
👻 Magi2: 0.2512 SOL
...
💰 Total Balance: 696.4096 SOL
*/
```

### Transaction Analysis

```javascript
// Question: "What happened in this transaction?"
const txSummary = await tracker.getTransactionSummary(signature);
console.log(txSummary);
/* Output:
Transaction: 2GvgQi9NGemVDdJ7...
Status: ✅ Success
Fee: 0.000005 SOL

SOL Changes:
  HYWo71Wk9... +24.4100 SOL
  6xmZMV8neb... -24.4105 SOL
*/
```

---

## LLM-Friendly APIs

All methods are designed to return formatted text that LLMs can easily parse and understand.

### Wallet Information

```javascript
// Structured data for analysis
const info = await tracker.getWalletInfo('whale');
/*
{
  address: "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
  name: "whale",
  emoji: "🐳",
  balance: 347.5164,
  balanceFormatted: "347.5164 SOL",
  metadata: { ... }
}
*/

// Human-readable summary
const summary = await tracker.getWalletSummary('whale');
// "🐳 whale: 347.5164 SOL (HYWo71...)"
```

### Transaction Details

```javascript
const details = await tracker.getTransactionDetails(signature);
/*
{
  signature: "...",
  success: true,
  fee: 0.000005,
  balanceChanges: {
    "HYWo71...": 24.41,
    "6xmZMV...": -24.4105
  },
  tokenTransfers: [...]
}
*/
```

---

## Agent Use Cases

### 1. Portfolio Assistant

An AI agent that answers questions about wallet holdings:

```javascript
async function portfolioAgent(userQuery) {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  // Parse query intent
  if (userQuery.includes('balance') || userQuery.includes('how much')) {
    // Extract wallet name from query
    const walletName = extractWalletName(userQuery); // Your implementation
    const summary = await tracker.getWalletSummary(walletName);
    return `The ${walletName} wallet has ${summary}`;
  }

  if (userQuery.includes('all wallets') || userQuery.includes('portfolio')) {
    const summary = await tracker.getAllWalletsSummary();
    return summary;
  }

  if (userQuery.includes('activity') || userQuery.includes('transactions')) {
    const walletName = extractWalletName(userQuery);
    const history = await tracker.getTransactionHistory(walletName, 5);
    return formatHistory(history); // Your formatting function
  }
}
```

### 2. Transaction Analyzer

AI agent that explains blockchain transactions:

```javascript
async function transactionAnalyzer(signature) {
  const tracker = new WalletTracker();
  const details = await tracker.getTransactionDetails(signature);

  // Build analysis for LLM
  const context = `
Transaction Analysis:
- Signature: ${signature}
- Status: ${details.success ? 'Successful' : 'Failed'}
- Fee: ${details.fee} SOL
- Balance Changes: ${JSON.stringify(details.balanceChanges)}
- Token Transfers: ${details.tokenTransfers.length} transfers
  `;

  // Send to LLM for natural language explanation
  const explanation = await askLLM(`
    Analyze this Solana transaction and explain what happened in simple terms:
    ${context}
  `);

  return explanation;
}
```

### 3. Whale Watching Agent

Monitor large wallets and notify when activity occurs:

```javascript
import { WalletMonitor, AlertType } from './src/alerts.js';

async function whaleWatchingAgent() {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  const monitor = new WalletMonitor(tracker);

  monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
    // Generate natural language alert
    const message = `
🚨 Large transaction detected!

Wallet: ${alert.wallet.emoji} ${alert.wallet.name}
Amount: ${alert.transaction.amount.toFixed(4)} SOL
Time: ${new Date(alert.timestamp).toLocaleString()}
    `;

    // Send to LLM for analysis
    const analysis = await askLLM(`
      Analyze this large transaction and assess its significance:
      ${message}

      Transaction details: ${JSON.stringify(alert.transaction)}
    `);

    // Notify user
    await sendNotification(message + '\n\nAnalysis: ' + analysis);
  });

  await monitor.start();
}
```

### 4. Trading Decision Agent

AI agent that makes trading recommendations:

```javascript
async function tradingDecisionAgent(walletName) {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  // Get recent activity
  const history = await tracker.getDetailedTransactionHistory(walletName, 20);

  // Analyze patterns
  const context = {
    wallet: walletName,
    recentTransactions: history.transactions.length,
    largeTransactions: history.transactions.filter(tx =>
      tx.balanceChanges && Object.values(tx.balanceChanges).some(v => Math.abs(v) > 10)
    ).length,
    tokenActivity: history.transactions.filter(tx =>
      tx.tokenTransfers && tx.tokenTransfers.length > 0
    ).length
  };

  // Ask LLM for trading recommendation
  const recommendation = await askLLM(`
    Based on this wallet's recent activity, should we:
    1. Copy their trades?
    2. Trade against them?
    3. Wait and observe?

    Context: ${JSON.stringify(context, null, 2)}
    Recent transactions: ${JSON.stringify(history.transactions.slice(0, 5), null, 2)}

    Provide a recommendation with reasoning.
  `);

  return recommendation;
}
```

---

## Integration Patterns

### Pattern 1: Query Handler

```javascript
class WalletQueryHandler {
  constructor() {
    this.tracker = new WalletTracker();
    this.tracker.loadWallets();
  }

  async handleQuery(query) {
    const intent = await this.parseIntent(query);

    switch (intent.type) {
      case 'balance':
        return await this.tracker.getWalletSummary(intent.wallet);

      case 'portfolio':
        return await this.tracker.getAllWalletsSummary();

      case 'transactions':
        const history = await this.tracker.getTransactionHistory(
          intent.wallet,
          intent.limit || 5
        );
        return this.formatForLLM(history);

      case 'analysis':
        const details = await this.tracker.getTransactionDetails(intent.signature);
        return await this.analyzeWithLLM(details);

      default:
        return "I don't understand that query.";
    }
  }

  async parseIntent(query) {
    // Use LLM or simple pattern matching
    // Return { type, wallet, signature, limit, etc. }
  }

  formatForLLM(data) {
    // Convert data to LLM-friendly format
    return JSON.stringify(data, null, 2);
  }

  async analyzeWithLLM(data) {
    // Send to LLM for analysis
  }
}
```

### Pattern 2: Event-Driven Agent

```javascript
class EventDrivenAgent {
  constructor() {
    this.tracker = new WalletTracker();
    this.tracker.loadWallets();
    this.monitor = new WalletMonitor(this.tracker);
    this.memory = []; // Agent's memory
  }

  async start() {
    // Listen to all events
    this.monitor.on('alert', async (alert) => {
      // Store in memory
      this.memory.push(alert);

      // Decide action based on agent's logic
      const action = await this.decideAction(alert);

      if (action) {
        await this.executeAction(action);
      }
    });

    await this.monitor.start();
  }

  async decideAction(alert) {
    // Use LLM to decide what to do
    const context = {
      alert,
      recentEvents: this.memory.slice(-10),
      currentStrategy: this.getCurrentStrategy()
    };

    const decision = await askLLM(`
      Given this new alert, what should I do?

      Alert: ${JSON.stringify(alert)}
      Recent context: ${JSON.stringify(context.recentEvents)}

      Options:
      1. Execute trade
      2. Send notification
      3. Gather more information
      4. Do nothing

      Respond with the action and reasoning.
    `);

    return this.parseDecision(decision);
  }

  async executeAction(action) {
    switch (action.type) {
      case 'trade':
        // Execute trade logic
        break;
      case 'notify':
        // Send notification
        break;
      case 'investigate':
        // Gather more data
        break;
    }
  }
}
```

### Pattern 3: Autonomous Trading Bot

```javascript
import { TradingBot, TradingStrategies } from './src/trading-bot.js';

class AITradingAgent {
  constructor(walletManager) {
    this.tracker = new WalletTracker();
    this.tracker.loadWallets();

    this.bot = new TradingBot(this.tracker, walletManager, {
      dryRun: true,  // Start in simulation
      maxTradeAmount: 0.1
    });
  }

  async start() {
    // Register AI-powered strategy
    this.bot.registerStrategy('ai-decision', {
      condition: async (alert, bot) => {
        // Ask LLM if this is a trading opportunity
        const decision = await this.askLLMToTrade(alert);
        return decision.shouldTrade;
      },

      action: async (alert, bot) => {
        // Ask LLM how much to trade
        const decision = await this.askLLMToTrade(alert);

        return {
          action: decision.action,
          amount: decision.amount
        };
      }
    });

    await this.bot.start();
  }

  async askLLMToTrade(alert) {
    const prompt = `
Analyze this trading opportunity:

Wallet: ${alert.wallet.name}
Transaction: ${alert.transaction.amount} SOL
Type: ${alert.type}

Historical context: [Include recent performance data]

Should we trade? If yes, what action and how much?

Respond in JSON format:
{
  "shouldTrade": true/false,
  "action": "buy"/"sell"/"copy",
  "amount": 0.1,
  "reasoning": "explanation"
}
    `;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }
}
```

---

## Autonomous Trading Agents

### Running the Bot Continuously

```bash
# Start bot in tmux for multi-day testing
./bot-manager.sh start

# Check status
./bot-manager.sh status

# View activity
./bot-manager.sh logs

# Attach to view live
./bot-manager.sh attach
# (Press Ctrl+B then D to detach)

# Stop when done
./bot-manager.sh stop
```

### Bot Management Commands

```bash
# npm shortcuts
npm run bot-start    # Start in background
npm run bot-stop     # Stop bot
npm run bot-status   # Check if running
npm run bot-logs     # View recent activity
```

### Agent-Bot Integration

```javascript
// Let the bot run, and have your agent analyze results
class AnalyticsAgent {
  async analyzeBot Performance() {
    // Read bot trade history
    const bot = new TradingBot(tracker, walletManager);
    const stats = bot.getStats();
    const history = bot.getTradeHistory(100);

    // Analyze with LLM
    const analysis = await askLLM(`
      Analyze this trading bot's performance:

      Statistics: ${JSON.stringify(stats)}
      Recent trades: ${JSON.stringify(history.slice(-10))}

      What patterns do you see?
      Which strategies are most successful?
      What should we adjust?
    `);

    return analysis;
  }
}
```

---

## Best Practices

### 1. Error Handling

```javascript
async function safeQuery(tracker, walletName) {
  try {
    const summary = await tracker.getWalletSummary(walletName);
    return summary;
  } catch (error) {
    // Return LLM-friendly error
    return `Unable to fetch wallet data: ${error.message}`;
  }
}
```

### 2. Rate Limiting

```javascript
class RateLimitedAgent {
  constructor() {
    this.lastRequest = 0;
    this.minInterval = 1000; // 1 second between requests
  }

  async query(tracker, method, ...args) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - timeSinceLastRequest));
    }

    this.lastRequest = Date.now();
    return await tracker[method](...args);
  }
}
```

### 3. Context Management

```javascript
class ContextAwareAgent {
  constructor() {
    this.conversationHistory = [];
    this.walletCache = new Map();
  }

  async handleQuery(query) {
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    // Use cached data when possible
    const cacheKey = this.getCacheKey(query);
    if (this.walletCache.has(cacheKey)) {
      const cached = this.walletCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30s cache
        return cached.data;
      }
    }

    // Fetch fresh data
    const response = await this.fetchData(query);

    // Cache it
    this.walletCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    // Add to history
    this.conversationHistory.push({ role: 'assistant', content: response });

    return response;
  }
}
```

### 4. Streaming Responses

```javascript
async function* streamWalletUpdates(tracker) {
  while (true) {
    const summary = await tracker.getAllWalletsSummary();
    yield summary;
    await new Promise(r => setTimeout(r, 60000)); // Every minute
  }
}

// Usage
for await (const update of streamWalletUpdates(tracker)) {
  console.log('Portfolio update:', update);
  // Feed to LLM or display to user
}
```

---

## Example: Full AI Agent

```javascript
import Anthropic from '@anthropic-ai/sdk';
import { WalletTracker } from './src/tracker.js';
import { WalletMonitor, AlertType } from './src/alerts.js';

class SolanaWalletAgent {
  constructor(apiKey) {
    this.anthropic = new Anthropic({ apiKey });
    this.tracker = new WalletTracker();
    this.tracker.loadWallets();
    this.monitor = new WalletMonitor(this.tracker);
  }

  async start() {
    console.log('🤖 AI Wallet Agent started');

    // Monitor for events
    this.monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
      await this.handleLargeTransaction(alert);
    });

    await this.monitor.start();
  }

  async handleQuery(userQuery) {
    // Get relevant data
    const context = await this.gatherContext(userQuery);

    // Ask Claude
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `
You are a Solana wallet analyst. Answer this question using the provided data:

Question: ${userQuery}

Available data:
${context}

Provide a clear, concise answer.
        `
      }]
    });

    return response.content[0].text;
  }

  async gatherContext(query) {
    // Intelligently gather relevant data
    let context = '';

    if (query.includes('balance') || query.includes('portfolio')) {
      context += await this.tracker.getAllWalletsSummary();
    }

    if (query.includes('transaction') || query.includes('activity')) {
      // Get recent activity for relevant wallets
      const walletName = this.extractWalletName(query);
      if (walletName) {
        const history = await this.tracker.getTransactionHistory(walletName, 5);
        context += `\n\nRecent transactions for ${walletName}:\n${JSON.stringify(history, null, 2)}`;
      }
    }

    return context;
  }

  async handleLargeTransaction(alert) {
    const analysis = await this.analyzeTransaction(alert);
    console.log(`\n🧠 AI Analysis:\n${analysis}\n`);
  }

  async analyzeTransaction(alert) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `
Analyze this large Solana transaction:

Wallet: ${alert.wallet.name}
Amount: ${alert.transaction.amount} SOL
Signature: ${alert.transaction.signature}

What does this transaction suggest about the wallet owner's intentions?
Is this significant? Should we take any action?
        `
      }]
    });

    return response.content[0].text;
  }

  extractWalletName(query) {
    // Simple extraction - enhance as needed
    const wallets = this.tracker.wallets.map(w => w.name);
    for (const wallet of wallets) {
      if (query.toLowerCase().includes(wallet.toLowerCase())) {
        return wallet;
      }
    }
    return null;
  }
}

// Usage
const agent = new SolanaWalletAgent(process.env.ANTHROPIC_API_KEY);
await agent.start();

// Query the agent
const answer = await agent.handleQuery("What's the whale's current balance?");
console.log(answer);
```

---

## Resources

- **API Documentation**: [API.md](./API.md)
- **Trading Guide**: [TRADING.md](./TRADING.md)
- **Extension Patterns**: [EXTENSIONS.md](./EXTENSIONS.md)
- **Examples**: [examples/](./examples/)

---

## Contributing

When adding new agent patterns or integrations:

1. Add examples to this file
2. Include error handling
3. Show both simple and advanced usage
4. Document any LLM prompts used
5. Provide working code examples

This file is continuously updated with new patterns and best practices.
