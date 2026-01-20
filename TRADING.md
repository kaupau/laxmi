# Laxmi Wallet Tracker - Trading Documentation

Complete guide for wallet management and automated trading features.

---

## ⚠️ CRITICAL WARNINGS

**READ THIS BEFORE USING TRADING FEATURES:**

1. **Financial Risk**: Trading cryptocurrencies carries significant financial risk. You can lose money.
2. **Start Small**: Always test with small amounts you can afford to lose
3. **Use Devnet First**: Test all strategies on devnet before using mainnet
4. **Dry Run Mode**: Use simulation mode extensively before live trading
5. **Monitor Actively**: Never leave a bot running unattended
6. **Private Keys**: Never share or commit your private keys
7. **No Guarantees**: Past performance doesn't guarantee future results
8. **Own Responsibility**: You are solely responsible for your trading decisions

---

## Table of Contents

1. [Wallet Management](#wallet-management)
2. [Trading Bot Framework](#trading-bot-framework)
3. [Trading Strategies](#trading-strategies)
4. [Security Best Practices](#security-best-practices)
5. [Example Workflows](#example-workflows)

---

## Wallet Management

### Creating a New Wallet

```javascript
import { WalletManager } from './src/wallet.js';

const walletManager = new WalletManager('https://api.devnet.solana.com');

// Create new wallet
const wallet = walletManager.createWallet();
console.log('Public Key:', wallet.publicKey);
console.log('Private Key:', wallet.secretKey);

// 🔒 SAVE THIS PRIVATE KEY SECURELY!
```

### Loading an Existing Wallet

```javascript
// From base58 private key
const privateKey = process.env.WALLET_PRIVATE_KEY;
walletManager.loadWallet(privateKey);

// From file (not recommended for production)
walletManager.loadWalletFromFile('./my-wallet.json');

// From array
const secretKeyArray = [1, 2, 3, ...]; // Your 64-byte array
walletManager.loadWalletFromArray(secretKeyArray);
```

### Sending SOL

```javascript
// Send SOL to another address
const result = await walletManager.sendSol(
  'recipient_address_here',
  0.1  // amount in SOL
);

console.log('Transaction:', result.signature);
console.log('Success:', result.success);
```

### Checking Balance

```javascript
const balance = await walletManager.getBalance();
console.log(`Balance: ${balance.toFixed(4)} SOL`);

// Check minimum balance
const hasMinimum = await walletManager.hasMinimumBalance(0.1);
```

### Getting Devnet SOL

```javascript
// Only works on devnet/testnet
await walletManager.airdrop(1);  // Request 1 SOL

// Or use the Solana faucet: https://faucet.solana.com
```

---

## Trading Bot Framework

### Basic Setup

```javascript
import { WalletTracker } from './src/tracker.js';
import { WalletManager } from './src/wallet.js';
import { TradingBot } from './src/trading-bot.js';

// Initialize components
const tracker = new WalletTracker();
tracker.loadWallets();

const walletManager = new WalletManager();
walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);

// Create bot
const bot = new TradingBot(tracker, walletManager, {
  enabled: false,         // Start paused
  dryRun: true,          // Simulate trades
  maxTradeAmount: 0.1,   // Max 0.1 SOL per trade
  minWalletBalance: 0.05, // Keep minimum 0.05 SOL
  copyRatio: 0.1         // Copy 10% of tracked wallet's size
});
```

### Bot Configuration

```javascript
const botOptions = {
  // Bot control
  enabled: false,        // Enable/disable trading
  dryRun: true,         // true = simulate, false = real trading

  // Trading limits
  maxTradeAmount: 0.1,        // Maximum SOL per trade
  minWalletBalance: 0.05,     // Minimum balance to maintain
  copyRatio: 0.1,            // Percentage to copy (0.1 = 10%)

  // Monitoring options
  monitorOptions: {
    pollInterval: 10000,              // Check every 10s
    largeTransactionThreshold: 10     // Alert on 10+ SOL
  }
};

const bot = new TradingBot(tracker, walletManager, botOptions);
```

### Controlling the Bot

```javascript
// Start monitoring and trading
await bot.start();

// Enable/disable trading
bot.setEnabled(true);   // Start trading
bot.setEnabled(false);  // Pause trading (still monitors)

// Toggle dry run
bot.setDryRun(true);   // Simulate trades
bot.setDryRun(false);  // Execute real trades ⚠️

// Stop bot
bot.stop();

// Get statistics
const stats = bot.getStats();
console.log(stats);
```

---

## Trading Strategies

### Built-in Strategies

#### 1. Copy Trading

Mirror trades from specific wallets:

```javascript
import { TradingStrategies } from './src/trading-bot.js';

bot.registerStrategy(
  'copy-whale',
  TradingStrategies.copyTrading('whale', {
    minAmount: 1  // Only copy trades >= 1 SOL
  })
);
```

**How it works:**
- Monitors target wallet for incoming transactions
- Calculates copy amount based on `copyRatio`
- Executes similar trade (simulated or real)

#### 2. Whale Follower

Trade when large transactions occur:

```javascript
bot.registerStrategy(
  'follow-large-trades',
  TradingStrategies.whaleFollower(10, {  // Threshold: 10 SOL
    fixedAmount: 0.05  // Always trade 0.05 SOL
  })
);
```

**How it works:**
- Triggers when transaction >= threshold
- Executes fixed amount trade
- Good for following whale movements

#### 3. Token Sniper

Buy tokens when tracked wallets buy them:

```javascript
bot.registerStrategy(
  'snipe-tokens',
  TradingStrategies.tokenSniper(['good_trader', 'whale'], {
    fixedAmount: 0.05  // Use 0.05 SOL per token buy
  })
);
```

**How it works:**
- Detects token transfers in tracked wallets
- Identifies token buys (positive amount)
- Attempts to buy same token quickly

**Note:** Token buying requires Jupiter integration (see below)

### Custom Strategies

Create your own trading logic:

```javascript
bot.registerStrategy('my-custom-strategy', {
  // Condition: when should this strategy trigger?
  condition: async (alert, bot) => {
    // Return true to trigger, false to skip
    return alert.wallet.name === 'whale' &&
           alert.transaction.amount > 5 &&
           alert.type === 'TRANSACTION_RECEIVED';
  },

  // Action: what to do when triggered?
  action: async (alert, bot) => {
    // Return trade parameters
    return {
      action: 'send_sol',  // or 'buy_token', etc.
      amount: 0.1,
      to: 'recipient_address_here'
    };

    // Or return null to not trade
    // return null;
  },

  // Optional configuration
  config: {
    // Your custom config
  }
});
```

### Strategy Examples

#### Alert Only (No Trading)

```javascript
bot.registerStrategy('alert-only', {
  condition: async (alert, bot) => {
    return alert.wallet.name === 'Ansem';
  },
  action: async (alert, bot) => {
    console.log(`🚨 Ansem activity: ${alert.transaction.amount} SOL`);
    return null;  // Don't execute trade
  }
});
```

#### Conditional Trading

```javascript
bot.registerStrategy('smart-copy', {
  condition: async (alert, bot) => {
    // Only trade during certain hours
    const hour = new Date().getHours();
    const duringTradingHours = hour >= 9 && hour <= 17;

    return alert.wallet.name === 'whale' &&
           alert.transaction.amount > 10 &&
           duringTradingHours;
  },
  action: async (alert, bot) => {
    const balance = await bot.walletManager.getBalance();

    // Only trade if we have enough balance
    if (balance < 0.2) {
      console.log('⚠️ Insufficient balance, skipping trade');
      return null;
    }

    return {
      action: 'copy_trade',
      amount: 0.1
    };
  }
});
```

---

## Security Best Practices

### Private Key Management

**✅ DO:**
- Store private keys in `.env` files (never committed)
- Use environment variables
- Encrypt sensitive files
- Keep offline backups
- Use hardware wallets for large amounts

**❌ DON'T:**
- Commit private keys to git
- Share private keys
- Store in plain text files in the repo
- Email or message private keys
- Screenshot private keys

### Environment Variables

```bash
# .env file (add to .gitignore!)
WALLET_PRIVATE_KEY=your_base58_private_key_here
SOLANA_RPC_URL=https://your-premium-rpc.com

# Trading settings
MAX_TRADE_AMOUNT=0.1
MIN_WALLET_BALANCE=0.05
```

```javascript
// Load in your code
import dotenv from 'dotenv';
dotenv.config();

const walletManager = new WalletManager(process.env.SOLANA_RPC_URL);
walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);
```

### Testing Safely

```javascript
// 1. Start with devnet
const DEVNET_RPC = 'https://api.devnet.solana.com';
const walletManager = new WalletManager(DEVNET_RPC);

// 2. Use dry run mode
const bot = new TradingBot(tracker, walletManager, {
  dryRun: true  // Simulates trades
});

// 3. Start paused
bot.setEnabled(false);  // Monitor only

// 4. Test with small amounts
bot.options.maxTradeAmount = 0.01;  // 0.01 SOL max
```

### Monitoring and Limits

```javascript
// Set trading limits
const bot = new TradingBot(tracker, walletManager, {
  maxTradeAmount: 0.1,         // Never trade more than 0.1 SOL
  minWalletBalance: 0.05,      // Always keep 0.05 SOL
  copyRatio: 0.1              // Only copy 10% of trade size
});

// Monitor bot activity
bot.on('trade', (trade) => {
  console.log('Trade executed:', trade);
  // Send notification, log to database, etc.
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
  // Alert yourself, stop bot if critical
});

// Check stats regularly
setInterval(() => {
  const stats = bot.getStats();
  console.log('Bot stats:', stats);
}, 60000);
```

---

## Example Workflows

### Workflow 1: Setup and Test on Devnet

```bash
# 1. Create a wallet
npm run wallet-setup

# 2. Copy your private key to .env
echo "WALLET_PRIVATE_KEY=your_key_here" >> .env

# 3. Get devnet SOL
# Visit https://faucet.solana.com

# 4. Test sending SOL
node -e "
import { WalletManager } from './src/wallet.js';
import dotenv from 'dotenv';
dotenv.config();

const wm = new WalletManager('https://api.devnet.solana.com');
wm.loadWallet(process.env.WALLET_PRIVATE_KEY);

const balance = await wm.getBalance();
console.log('Balance:', balance, 'SOL');

// Send test transaction
const result = await wm.sendSol('RECIPIENT_ADDRESS', 0.01);
console.log('Sent! Signature:', result.signature);
"

# 5. Run copy trading bot in dry run mode
npm run copy-trading
```

### Workflow 2: Live Copy Trading (Mainnet)

```javascript
// ⚠️ USE WITH CAUTION - REAL MONEY!

import { WalletTracker } from './src/tracker.js';
import { WalletManager } from './src/wallet.js';
import { TradingBot, TradingStrategies } from './src/trading-bot.js';

// Use mainnet RPC
const tracker = new WalletTracker('https://api.mainnet-beta.solana.com');
tracker.loadWallets();

const walletManager = new WalletManager('https://api.mainnet-beta.solana.com');
walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);

// Conservative settings
const bot = new TradingBot(tracker, walletManager, {
  enabled: true,           // ⚠️ Trading enabled
  dryRun: false,           // ⚠️ Real trades
  maxTradeAmount: 0.05,    // Small amounts
  minWalletBalance: 0.1,   // Keep reserve
  copyRatio: 0.05          // 5% copy ratio
});

// Simple copy strategy
bot.registerStrategy('conservative-copy',
  TradingStrategies.copyTrading('whale', {
    minAmount: 10  // Only copy trades >= 10 SOL
  })
);

// Monitor closely
bot.on('trade', (trade) => {
  console.log('🚨 REAL TRADE EXECUTED:', trade);
  // Send yourself a notification!
});

await bot.start();
```

### Workflow 3: Token Sniping

```javascript
// Monitor for token buys and copy them
const bot = new TradingBot(tracker, walletManager, {
  dryRun: true,  // Start in dry run!
  maxTradeAmount: 0.1
});

bot.registerStrategy('snipe-whale-tokens',
  TradingStrategies.tokenSniper(['whale', 'good_trader'], {
    fixedAmount: 0.05  // Use 0.05 SOL per token
  })
);

// Custom logic for specific tokens
bot.registerStrategy('whitelist-tokens', {
  condition: async (alert, bot) => {
    // Only snipe specific tokens
    const whitelist = ['token_mint_1', 'token_mint_2'];

    if (alert.type !== 'TOKEN_TRANSFER') return false;

    const transfer = alert.transaction.tokenTransfers[0];
    return transfer && whitelist.includes(transfer.mint);
  },
  action: async (alert, bot) => {
    return {
      action: 'buy_token',
      tokenMint: alert.transaction.tokenTransfers[0].mint,
      amount: 0.05
    };
  }
});

await bot.start();
```

---

## Jupiter DEX Integration (Coming Soon)

For token swaps, you'll need to integrate with Jupiter:

```javascript
// Placeholder for Jupiter integration
async function swapToken(inputMint, outputMint, amount) {
  // Use Jupiter API to get quote
  // Execute swap transaction
  // Return result
}
```

See `EXTENSIONS.md` for Jupiter integration examples.

---

## Troubleshooting

### Bot Not Trading

```javascript
// Check these settings:
console.log('Enabled:', bot.options.enabled);  // Must be true
console.log('Dry Run:', bot.options.dryRun);   // false for real trades
console.log('Wallet:', walletManager.wallet);   // Must be loaded

// Check balance
const balance = await walletManager.getBalance();
console.log('Balance:', balance, 'Need minimum:', bot.options.minWalletBalance);
```

### Transaction Failures

```javascript
// Common issues:
// 1. Insufficient balance
// 2. Network congestion
// 3. Invalid recipient address
// 4. RPC rate limits

// Add error handling:
bot.on('error', ({ strategy, error, alert }) => {
  console.error('Strategy error:', strategy);
  console.error('Error:', error.message);
  console.error('Alert:', alert);
});
```

### Rate Limiting

```javascript
// Use premium RPC endpoint
const PREMIUM_RPC = process.env.SOLANA_RPC_URL;

// Adjust poll interval
const bot = new TradingBot(tracker, walletManager, {
  monitorOptions: {
    pollInterval: 30000  // 30 seconds instead of 10
  }
});
```

---

## Risk Management

### Position Sizing

```javascript
// Never risk more than X% of balance
const balance = await walletManager.getBalance();
const maxRisk = balance * 0.1;  // 10% of balance

bot.options.maxTradeAmount = Math.min(
  bot.options.maxTradeAmount,
  maxRisk
);
```

### Stop Loss (Implement Yourself)

```javascript
const positions = new Map();  // Track your positions

bot.on('trade', (trade) => {
  if (trade.params.action === 'buy_token') {
    positions.set(trade.params.tokenMint, {
      entry: trade.params.amount,
      timestamp: Date.now()
    });
  }
});

// Periodically check prices and sell if down X%
// (Requires price oracle integration)
```

### Daily Limits

```javascript
let dailyVolume = 0;
const MAX_DAILY_VOLUME = 1.0;  // 1 SOL per day

bot.registerStrategy('limited-copy', {
  condition: async (alert, bot) => {
    return dailyVolume < MAX_DAILY_VOLUME &&
           alert.wallet.name === 'whale';
  },
  action: async (alert, bot) => {
    const tradeAmount = 0.1;
    dailyVolume += tradeAmount;

    return {
      action: 'copy_trade',
      amount: tradeAmount
    };
  }
});

// Reset daily at midnight
setInterval(() => {
  dailyVolume = 0;
}, 24 * 60 * 60 * 1000);
```

---

## Next Steps

1. **Test on Devnet**: Run `npm run wallet-setup` and test with devnet SOL
2. **Simulate Trades**: Use `npm run copy-trading` with `dryRun: true`
3. **Monitor First**: Run bot with `enabled: false` to just watch
4. **Start Small**: Use tiny amounts when going live
5. **Scale Gradually**: Increase amounts only after proven success

---

## Support and Resources

- **Solana Docs**: https://docs.solana.com
- **Solana Faucet**: https://faucet.solana.com
- **Jupiter DEX**: https://jup.ag
- **Solscan Explorer**: https://solscan.io

---

**Remember: Trading is risky. Only trade what you can afford to lose. This software is provided as-is with no guarantees.**
