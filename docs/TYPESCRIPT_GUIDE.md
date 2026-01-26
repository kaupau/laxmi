# TypeScript Usage Guide

This guide explains how to use the TypeScript version of the Solana Wallet Tracker.

## Quick Start

### Building the TypeScript Code

```bash
# Compile TypeScript to JavaScript
npm run build

# Watch mode (recompile on changes)
npm run build:watch

# Type check without building
npm run type-check

# Clean compiled output
npm run clean
```

### Running TypeScript Files Directly

```bash
# Run with ts-node (development)
npx ts-node --esm src/paper-trading.ts

# Or use the configured script
npm run telegram-bot  # Runs with ts-node
```

## Project Structure

```
/root/
├── src/
│   ├── types/              # Type definitions
│   │   ├── index.ts        # Central exports
│   │   ├── common.ts       # Shared types
│   │   ├── dexscreener.ts  # DexScreener API types
│   │   ├── analysis.ts     # Token analysis types
│   │   ├── paper-trading.ts# Paper trading types
│   │   ├── jupiter.ts      # Jupiter API types
│   │   ├── alerts.ts       # Alert system types
│   │   ├── wallet.ts       # Wallet types
│   │   └── anthropic.ts    # AI thesis types
│   ├── paper-trading.ts    # Paper trading system
│   ├── token-analyzer.ts   # Token analysis
│   ├── trade-thesis-agent.ts # AI thesis generation
│   ├── jupiter-trader.ts   # Jupiter DEX integration
│   ├── wallet.ts           # Wallet management
│   ├── tracker.ts          # Wallet tracking
│   └── alerts.ts           # (To be converted)
├── telegram-bot.ts         # (To be converted)
├── tsconfig.json           # TypeScript config
└── dist/                   # Compiled JavaScript
```

## Type Definitions

### Importing Types

```typescript
// Import all types
import type { WalletConfig, TokenMetadata, TokenAnalysis } from './types/index.js';

// Import specific type files
import type { PaperTradingData, Portfolio } from './types/paper-trading.js';
import type { JupiterQuote, JupiterSwapResult } from './types/jupiter.js';

// Import classes
import { PaperTrading } from './paper-trading.js';
import { TokenAnalyzer } from './token-analyzer.js';
```

### Common Patterns

#### Result Type

```typescript
import type { Result } from './types/common.js';

// Function that can fail
async function fetchData(): Promise<Result<TokenMetadata, Error>> {
  try {
    const data = await fetch(/* ... */);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Usage with type narrowing
const result = await fetchData();
if (result.success) {
  console.log(result.data.symbol); // TypeScript knows data exists
} else {
  console.error(result.error.message); // TypeScript knows error exists
}
```

#### Union Types

```typescript
import type { Trade, BuyTrade, SellTrade } from './types/paper-trading.js';

function processTrade(trade: Trade): void {
  if (trade.type === 'BUY') {
    // TypeScript narrows to BuyTrade
    console.log(`Bought ${trade.tokensReceived} tokens`);
  } else {
    // TypeScript narrows to SellTrade
    console.log(`Sold for ${trade.profit} profit`);
  }
}
```

#### Generic Types

```typescript
// Generic helper type
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Usage
async function getBalance(address: string): AsyncResult<number> {
  try {
    const balance = await connection.getBalance(new PublicKey(address));
    return { success: true, data: balance / LAMPORTS_PER_SOL };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Using the Classes

### PaperTrading

```typescript
import { PaperTrading } from './src/paper-trading.js';
import type { Portfolio, BuyResult } from './src/types/paper-trading.js';

const paperTrading = new PaperTrading('./paper-trades.json');

// Enable paper trading
paperTrading.toggle();

// Execute a paper trade (fully typed)
const result: BuyResult = await paperTrading.buy(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  'USDC',
  0.1, // 0.1 SOL
  0.0001 // Price per token
);

// Access typed portfolio
const portfolio: Portfolio = paperTrading.getPortfolio();
console.log(`Balance: ${portfolio.balance} SOL`);
console.log(`Total trades: ${portfolio.stats.totalTrades}`);
```

### TokenAnalyzer

```typescript
import { TokenAnalyzer } from './src/token-analyzer.js';
import type { TokenAnalysis, TokenMetadata } from './src/types/index.js';

const analyzer = new TokenAnalyzer(
  'https://api.mainnet-beta.solana.com',
  trackedWallets
);

// Get token metadata (nullable)
const metadata: TokenMetadata | null = await analyzer.getTokenMetadata(tokenMint);

if (metadata) {
  console.log(`Token: ${metadata.symbol}`);
  console.log(`Price: $${metadata.price}`);
}

// Full analysis with type safety
const analysis: TokenAnalysis = await analyzer.analyzeToken(tokenMint);

if (analysis.success) {
  console.log(`Market cap: ${analysis.marketData?.marketCapFormatted}`);
  console.log(`In range: ${analysis.marketData?.inTargetRange}`);
}
```

### WalletManager

```typescript
import { WalletManager } from './src/wallet.js';
import type { WalletCreationResult, SendSolResult } from './src/types/wallet.js';

const wallet = new WalletManager();

// Create new wallet (typed result)
const created: WalletCreationResult = wallet.createWallet();
console.log(`Public key: ${created.publicKey}`);
console.log(`Secret key: ${created.secretKey}`);

// Send SOL with type safety
const result: SendSolResult = await wallet.sendSol(
  'DestinationAddress',
  0.1, // Amount in SOL
  { commitment: 'confirmed' } // Typed options
);

if (result.success) {
  console.log(`Transaction: ${result.signature}`);
}
```

### TradeThesisAgent

```typescript
import { TradeThesisAgent } from './src/trade-thesis-agent.js';
import type { ThesisResult } from './src/types/anthropic.js';
import type { TokenAnalysis } from './src/types/analysis.js';

const agent = new TradeThesisAgent(process.env.ANTHROPIC_API_KEY);

const thesis: ThesisResult = await agent.generateThesis(
  analysis,
  walletInfo,
  transactionDetails
);

// Type-safe recommendation
switch (thesis.recommendation) {
  case 'BUY':
    console.log('🟢 Buy signal!');
    break;
  case 'WATCH':
    console.log('🟡 Watch this token');
    break;
  case 'SKIP':
    console.log('🔴 Skip this one');
    break;
}
```

## Error Handling

### With try-catch

```typescript
import { TokenAnalyzer } from './src/token-analyzer.js';

async function analyzeToken(mint: string): Promise<void> {
  try {
    const metadata = await analyzer.getTokenMetadata(mint);

    if (!metadata) {
      console.log('Token not found on DexScreener');
      return;
    }

    console.log(`Found ${metadata.symbol}`);
  } catch (error) {
    // Type-safe error handling
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
  }
}
```

### With Result Type

```typescript
async function safeGetBalance(
  wallet: WalletManager
): Promise<Result<number, Error>> {
  try {
    const balance = await wallet.getBalance();
    return { success: true, data: balance };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// Usage
const result = await safeGetBalance(wallet);
if (result.success) {
  console.log(`Balance: ${result.data} SOL`);
} else {
  console.error(result.error.message);
}
```

## Type Guards

### Custom Type Guards

```typescript
import type { Trade, BuyTrade, SellTrade } from './src/types/paper-trading.js';

// Type guard for BuyTrade
function isBuyTrade(trade: Trade): trade is BuyTrade {
  return trade.type === 'BUY';
}

// Type guard for SellTrade
function isSellTrade(trade: Trade): trade is SellTrade {
  return trade.type === 'SELL';
}

// Usage with type narrowing
function analyzeTrade(trade: Trade): void {
  if (isBuyTrade(trade)) {
    console.log(`Bought ${trade.tokensReceived} tokens`);
    // TypeScript knows this is BuyTrade
  } else if (isSellTrade(trade)) {
    console.log(`Profit: ${trade.profit} SOL`);
    // TypeScript knows this is SellTrade
  }
}
```

## Best Practices

### 1. Use Type Imports

```typescript
// Prefer type imports for clarity
import type { TokenMetadata } from './types/dexscreener.js';

// Or use inline type imports
import { type TokenMetadata, TokenAnalyzer } from './token-analyzer.js';
```

### 2. Avoid `any`

```typescript
// Bad
function processData(data: any) {
  return data.value;
}

// Good
function processData<T extends { value: unknown }>(data: T) {
  return data.value;
}
```

### 3. Use Nullish Coalescing

```typescript
// Instead of ||
const value = data.price ?? 0; // Only if null/undefined

// Optional chaining
const symbol = metadata?.baseToken?.symbol ?? 'UNKNOWN';
```

### 4. Define Return Types

```typescript
// Explicit return types help catch errors
async function getWalletInfo(address: string): Promise<WalletInfo> {
  // Implementation
  return { /* ... */ };
}
```

### 5. Use Readonly for Immutable Data

```typescript
interface Config {
  readonly rpcUrl: string;
  readonly wallets: readonly WalletConfig[];
}
```

## IDE Integration

### VS Code

TypeScript works best with VS Code:
- Auto-completion for types
- Inline error detection
- Go to definition (Ctrl/Cmd + Click)
- Refactoring support
- Type information on hover

### Recommended Extensions

- ESLint
- Prettier
- TypeScript Importer
- Error Lens

## Debugging

### Source Maps

TypeScript generates source maps for debugging:

```bash
# Build with source maps
npm run build

# Debug compiled JavaScript but see TypeScript
node --inspect dist/src/paper-trading.js
```

### Type Checking

```bash
# Check types without compiling
npm run type-check

# Watch mode for continuous checking
npm run build:watch
```

## Common Issues

### Issue: Cannot find module

```typescript
// Error: Cannot find module './types'
import type { WalletConfig } from './types';

// Fix: Add .js extension (even for .ts files!)
import type { WalletConfig } from './types/index.js';
```

### Issue: Type 'X' is not assignable

```typescript
// Error: Type 'number | null' is not assignable to type 'number'
const balance: number = wallet.balance;

// Fix: Handle null case
const balance: number = wallet.balance ?? 0;
```

### Issue: Property does not exist

```typescript
// Error: Property 'symbol' does not exist on type 'never'
const symbol = data.pairs[0].baseToken.symbol;

// Fix: Add type guard
if (data.pairs && data.pairs.length > 0) {
  const symbol = data.pairs[0]?.baseToken?.symbol;
}
```

## Performance Tips

1. **Use `--incremental` flag**: Faster rebuilds
2. **Skip lib check**: `--skipLibCheck` for faster compilation
3. **Separate type checking**: Run `type-check` separately from builds
4. **Module resolution cache**: TypeScript caches module resolution

## Migration from JavaScript

If you have existing JavaScript code:

1. Rename `.js` to `.ts`
2. Add type annotations gradually
3. Start with function parameters and return types
4. Use `// @ts-expect-error` for temporary issues
5. Enable strict mode incrementally

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Solana Web3.js Types](https://solana-labs.github.io/solana-web3.js/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

---

**Last Updated**: 2026-01-25
**TypeScript Version**: 5.9.3
