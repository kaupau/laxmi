# laxmi
Solana Wallet Tracker - Simple utility for tracking wallet balances and transactions

## Features

- Track multiple Solana wallets with custom names and emojis
- Get real-time SOL balances
- Fetch recent transaction history
- LLM-friendly output formatting
- Simple API for easy integration

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

## API Reference

### WalletTracker

#### Methods

- `loadWallets(configPath)` - Load wallets from JSON config
- `getWalletByName(name)` - Find wallet by name
- `getBalance(address)` - Get SOL balance for address
- `getWalletInfo(nameOrAddress)` - Get detailed wallet info
- `getAllWalletsInfo()` - Get info for all tracked wallets
- `getWalletSummary(nameOrAddress)` - Get LLM-friendly summary
- `getAllWalletsSummary()` - Get summary of all wallets
- `getTransactionHistory(nameOrAddress, limit)` - Get recent transactions

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
