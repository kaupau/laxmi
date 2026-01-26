# Laxmi Wallet Tracker - API Documentation

Complete reference for the Wallet Tracker utility with input/output specifications, transaction details, and extension patterns.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Core API Methods](#core-api-methods)
3. [Input/Output Specifications](#inputoutput-specifications)
4. [Transaction Details](#transaction-details)
5. [Alert System](#alert-system)
6. [Extension Patterns](#extension-patterns)
7. [Error Handling](#error-handling)

---

## Installation & Setup

```javascript
import { WalletTracker } from './src/tracker.js';

// Initialize with default RPC (mainnet)
const tracker = new WalletTracker();

// Or specify custom RPC endpoint
const trackerCustom = new WalletTracker('https://your-rpc-endpoint.com');

// Load wallet configuration
tracker.loadWallets(); // Uses default path: ./wallets.json
// OR
tracker.loadWallets('/path/to/custom-wallets.json');
```

---

## Core API Methods

### `loadWallets(configPath)`

Load wallet configuration from JSON file.

**Input:**
```javascript
configPath: string (optional)
// Default: './wallets.json'
```

**Output:**
```javascript
Array<WalletConfig>
```

**Example:**
```javascript
const wallets = tracker.loadWallets();
console.log(`Loaded ${wallets.length} wallets`);
```

---

### `getWalletByName(name)`

Find wallet configuration by name (case-insensitive).

**Input:**
```javascript
name: string
// Example: "whale", "Ansem", "GOOD_TRADER"
```

**Output:**
```javascript
{
  trackedWalletAddress: string,
  name: string,
  emoji: string,
  alertsOnToast: boolean,
  alertsOnBubble: boolean,
  alertsOnFeed: boolean,
  groups: string[],
  sound: string
} | undefined
```

**Example:**
```javascript
const whale = tracker.getWalletByName('whale');
// Returns: { name: 'whale', emoji: '🐳', trackedWalletAddress: 'HYWo7...', ... }
```

---

### `getBalance(address)`

Get SOL balance for a specific address.

**Input:**
```javascript
address: string
// Solana wallet address (base58 encoded)
// Example: "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp"
```

**Output:**
```javascript
number
// Balance in SOL (converted from lamports)
```

**Example:**
```javascript
const balance = await tracker.getBalance('HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp');
// Returns: 347.5164
```

---

### `getWalletInfo(nameOrAddress)`

Get comprehensive wallet information including balance and metadata.

**Input:**
```javascript
nameOrAddress: string
// Can be wallet name OR wallet address
// Examples: "whale" or "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp"
```

**Output:**
```javascript
{
  address: string,           // Wallet address
  name: string,              // Wallet name or 'Unknown'
  emoji: string,             // Display emoji
  balance: number,           // Balance in SOL
  balanceFormatted: string,  // Formatted balance string
  metadata: WalletConfig | null  // Full wallet config or null
}
```

**Example:**
```javascript
const info = await tracker.getWalletInfo('whale');
/* Returns:
{
  address: "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
  name: "whale",
  emoji: "🐳",
  balance: 347.5164,
  balanceFormatted: "347.5164 SOL",
  metadata: { ... }
}
*/
```

---

### `getAllWalletsInfo()`

Get information for all tracked wallets.

**Input:** None

**Output:**
```javascript
Array<{
  address: string,
  name: string,
  emoji: string,
  balance?: number,
  balanceFormatted?: string,
  metadata?: WalletConfig,
  error?: string  // Present if fetch failed
}>
```

**Example:**
```javascript
const allWallets = await tracker.getAllWalletsInfo();
/* Returns:
[
  { address: "HYWo7...", name: "whale", emoji: "🐳", balance: 347.5164, ... },
  { address: "5SLNT...", name: "Magi2", emoji: "👻", balance: 0.2512, ... },
  ...
]
*/
```

---

### `getWalletSummary(nameOrAddress)`

Get LLM-friendly one-line summary of wallet.

**Input:**
```javascript
nameOrAddress: string
```

**Output:**
```javascript
string
// Format: "{emoji} {name}: {balance} SOL ({address})"
```

**Example:**
```javascript
const summary = await tracker.getWalletSummary('whale');
// Returns: "🐳 whale: 347.5164 SOL (HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp)"
```

---

### `getAllWalletsSummary()`

Get LLM-friendly formatted summary of all wallets.

**Input:** None

**Output:**
```javascript
string
// Multi-line formatted text with all wallets and total balance
```

**Example:**
```javascript
const summary = await tracker.getAllWalletsSummary();
/* Returns:
"📊 Wallet Tracker Summary

🐳 whale: 347.5164 SOL
👻 Magi2: 0.2512 SOL
...

💰 Total Balance: 696.4096 SOL"
*/
```

---

### `getRecentTransactions(address, limit)`

Get recent transaction signatures for a wallet.

**Input:**
```javascript
address: string,  // Wallet address
limit: number     // Number of transactions (default: 10)
```

**Output:**
```javascript
Array<{
  signature: string,
  slot: number,
  blockTime: number | null,
  err: object | null,
  memo: string | null,
  confirmationStatus: string
}>
```

**Example:**
```javascript
const txs = await tracker.getRecentTransactions('HYWo71...', 5);
/* Returns:
[
  {
    signature: "2GvgQi9NGemVDdJ7X6ti...",
    slot: 123456789,
    blockTime: 1737369259,
    err: null,
    ...
  },
  ...
]
*/
```

---

### `getTransactionHistory(nameOrAddress, limit)`

Get formatted transaction history with metadata.

**Input:**
```javascript
nameOrAddress: string,
limit: number (optional, default: 5)
```

**Output:**
```javascript
{
  address: string,
  name: string,
  emoji: string,
  transactions: Array<{
    signature: string,
    slot: number,
    timestamp: string | null,  // ISO 8601 format
    error: object | null
  }>
}
```

**Example:**
```javascript
const history = await tracker.getTransactionHistory('whale', 3);
/* Returns:
{
  address: "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
  name: "whale",
  emoji: "🐳",
  transactions: [
    {
      signature: "2GvgQi9NGemVDdJ7X6ti...",
      slot: 123456789,
      timestamp: "2026-01-20T09:34:19.000Z",
      error: null
    },
    ...
  ]
}
*/
```

---

## Input/Output Specifications

### Wallet Configuration File Format

**File:** `wallets.json`

```json
[
  {
    "trackedWalletAddress": "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
    "name": "whale",
    "emoji": "🐳",
    "alertsOnToast": false,
    "alertsOnBubble": true,
    "alertsOnFeed": true,
    "groups": ["Main"],
    "sound": "default"
  }
]
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackedWalletAddress` | string | Yes | Solana wallet address (base58) |
| `name` | string | Yes | Human-readable wallet name |
| `emoji` | string | Yes | Display emoji for wallet |
| `alertsOnToast` | boolean | No | Enable toast notifications |
| `alertsOnBubble` | boolean | No | Enable bubble notifications |
| `alertsOnFeed` | boolean | No | Enable feed notifications |
| `groups` | string[] | No | Wallet grouping categories |
| `sound` | string | No | Alert sound identifier |

---

## Transaction Details

### Basic Transaction Information

Current implementation provides:

```javascript
{
  signature: string,      // Unique transaction ID
  slot: number,          // Blockchain slot number
  timestamp: string,     // ISO 8601 timestamp
  error: object | null   // Error if transaction failed
}
```

### Extended Transaction Details (Coming in v2)

To get detailed transaction information including amounts, token transfers, and instruction details, use the extended API:

```javascript
const details = await tracker.getTransactionDetails(signature);
```

**Output:**
```javascript
{
  signature: string,
  blockTime: number,
  slot: number,
  fee: number,                    // Transaction fee in SOL
  success: boolean,
  balanceChanges: {
    [address: string]: number     // SOL balance changes
  },
  tokenTransfers: [
    {
      mint: string,               // Token mint address
      from: string,               // Sender address
      to: string,                 // Recipient address
      amount: number,             // Transfer amount
      decimals: number,           // Token decimals
      symbol?: string            // Token symbol if known
    }
  ],
  instructions: [
    {
      programId: string,          // Program executed
      type: string,               // Instruction type
      data: object               // Parsed instruction data
    }
  ]
}
```

---

## Alert System

### Alert Configuration

Each wallet has alert settings:

```javascript
{
  alertsOnToast: boolean,   // Desktop notifications
  alertsOnBubble: boolean,  // In-app bubble alerts
  alertsOnFeed: boolean,    // Activity feed alerts
  sound: string             // Alert sound
}
```

### Alert Events

**Supported Alert Types:**
- `TRANSACTION_RECEIVED` - Incoming transaction
- `TRANSACTION_SENT` - Outgoing transaction
- `BALANCE_CHANGE` - Balance threshold crossed
- `TOKEN_TRANSFER` - Token transfer detected
- `LARGE_TRANSACTION` - Transaction above threshold

### Webhook Integration

```javascript
// Register webhook for alerts
tracker.registerWebhook({
  url: 'https://your-server.com/webhook',
  events: ['TRANSACTION_RECEIVED', 'LARGE_TRANSACTION'],
  wallets: ['whale', 'gremlin'],  // Specific wallets or 'all'
  filters: {
    minAmount: 10  // Minimum SOL amount
  }
});
```

**Webhook Payload:**
```json
{
  "event": "TRANSACTION_RECEIVED",
  "timestamp": "2026-01-20T09:34:19.000Z",
  "wallet": {
    "address": "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
    "name": "whale",
    "emoji": "🐳"
  },
  "transaction": {
    "signature": "2GvgQi9NGemVDdJ7X6ti...",
    "amount": 24.41,
    "type": "INCOMING",
    "from": "5SLNT...",
    "to": "HYWo71..."
  }
}
```

---

## Extension Patterns

### 1. Custom Monitoring Loop

```javascript
async function monitorWallets() {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  let lastChecked = {};

  while (true) {
    for (const wallet of tracker.wallets) {
      const txs = await tracker.getRecentTransactions(
        wallet.trackedWalletAddress,
        1
      );

      if (txs[0].signature !== lastChecked[wallet.name]) {
        console.log(`🚨 New transaction for ${wallet.emoji} ${wallet.name}`);
        // Trigger alert
        lastChecked[wallet.name] = txs[0].signature;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s poll
  }
}
```

### 2. Balance Change Alerts

```javascript
async function trackBalanceChanges() {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  const balances = {};

  setInterval(async () => {
    for (const wallet of tracker.wallets) {
      const newBalance = await tracker.getBalance(wallet.trackedWalletAddress);
      const oldBalance = balances[wallet.name] || newBalance;

      if (Math.abs(newBalance - oldBalance) > 1) { // Changed by >1 SOL
        console.log(`💰 ${wallet.emoji} ${wallet.name}: ${oldBalance} → ${newBalance} SOL`);
        // Send alert
      }

      balances[wallet.name] = newBalance;
    }
  }, 30000); // Check every 30s
}
```

### 3. Discord/Telegram Integration

```javascript
async function sendDiscordAlert(wallet, transaction) {
  await fetch('YOUR_DISCORD_WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `${wallet.emoji} ${wallet.name} - New Transaction`,
        description: `Transaction: ${transaction.signature}`,
        fields: [
          { name: 'Wallet', value: wallet.address },
          { name: 'Time', value: new Date().toLocaleString() }
        ],
        color: 0x00ff00
      }]
    })
  });
}
```

### 4. Database Logging

```javascript
async function logTransactionsToDB(tracker) {
  for (const wallet of tracker.wallets) {
    const history = await tracker.getTransactionHistory(wallet.name, 10);

    for (const tx of history.transactions) {
      await db.insert('transactions', {
        wallet_address: history.address,
        wallet_name: history.name,
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.timestamp,
        created_at: new Date()
      });
    }
  }
}
```

### 5. LLM Agent Integration

```javascript
// For AI assistants to query wallet data
async function llmQueryHandler(query) {
  const tracker = new WalletTracker();
  tracker.loadWallets();

  if (query.includes('balance')) {
    const walletName = extractWalletName(query);
    return await tracker.getWalletSummary(walletName);
  }

  if (query.includes('all wallets')) {
    return await tracker.getAllWalletsSummary();
  }

  if (query.includes('recent activity')) {
    const walletName = extractWalletName(query);
    const history = await tracker.getTransactionHistory(walletName, 5);
    return formatHistoryForLLM(history);
  }
}
```

---

## Error Handling

### Common Errors

```javascript
try {
  const balance = await tracker.getBalance('invalid-address');
} catch (error) {
  // Error: Invalid public key input
}

try {
  const info = await tracker.getWalletInfo('nonexistent');
} catch (error) {
  // Returns: { name: 'Unknown', ... }
  // No error thrown, returns default values
}

try {
  const txs = await tracker.getRecentTransactions('address', 1000);
} catch (error) {
  // Error: RPC rate limit exceeded
}
```

### Best Practices

1. **Rate Limiting**: Public RPC endpoints have limits
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
   ```

2. **Retry Logic**: Handle network failures
   ```javascript
   async function retryRequest(fn, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

3. **Batch Processing**: Reduce RPC calls
   ```javascript
   const balances = await Promise.all(
     wallets.map(w => tracker.getBalance(w.trackedWalletAddress))
   );
   ```

---

## Performance Considerations

### RPC Endpoint Selection

```javascript
// Free public endpoint (rate limited)
const tracker = new WalletTracker('https://api.mainnet-beta.solana.com');

// Paid RPC for production (faster, higher limits)
const tracker = new WalletTracker('https://your-premium-rpc.com');
```

### Caching Strategy

```javascript
class CachedTracker extends WalletTracker {
  constructor() {
    super();
    this.cache = new Map();
    this.cacheTTL = 30000; // 30s
  }

  async getBalance(address) {
    const cached = this.cache.get(address);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.balance;
    }

    const balance = await super.getBalance(address);
    this.cache.set(address, { balance, time: Date.now() });
    return balance;
  }
}
```

---

## Next Steps

See [EXTENSIONS.md](./EXTENSIONS.md) for:
- Real-time monitoring setup
- Alert system implementation
- Advanced transaction parsing
- Multi-chain support
- Analytics and reporting
