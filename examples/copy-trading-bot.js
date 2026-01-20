import { WalletTracker } from '../src/tracker.js';
import { WalletManager } from '../src/wallet.js';
import { TradingBot, TradingStrategies } from '../src/trading-bot.js';
import { AlertType } from '../src/alerts.js';

/**
 * Copy Trading Bot Example
 *
 * This bot monitors specified wallets and automatically mirrors their trades.
 *
 * WARNINGS:
 * - Start with DRY RUN mode (simulated trades)
 * - Test on devnet first
 * - Use small amounts
 * - Trading carries financial risk
 * - Monitor the bot actively
 */

async function main() {
  console.log('🤖 Copy Trading Bot\n');

  // Configuration
  const CONFIG = {
    network: 'devnet',  // Use 'mainnet-beta' for real trading (RISKY!)
    dryRun: true,       // Set to false for real trades (START WITH true!)
    enabled: false,     // Bot will not execute trades (set true when ready)

    // Trading parameters
    maxTradeAmount: 0.1,      // Maximum SOL per trade
    minWalletBalance: 0.05,   // Minimum balance to maintain
    copyRatio: 0.1,           // Copy 10% of tracked wallet's trade size

    // Monitoring
    pollInterval: 15000,      // Check every 15 seconds
    largeTransactionThreshold: 5  // Alert on 5+ SOL
  };

  console.log('⚙️  Configuration:');
  console.log(`   Network: ${CONFIG.network}`);
  console.log(`   Mode: ${CONFIG.dryRun ? '🧪 DRY RUN (simulated)' : '💰 LIVE TRADING'}`);
  console.log(`   Bot Status: ${CONFIG.enabled ? '✅ ENABLED' : '⏸️  PAUSED (monitoring only)'}`);
  console.log(`   Copy Ratio: ${(CONFIG.copyRatio * 100).toFixed(0)}%`);
  console.log(`   Max Trade: ${CONFIG.maxTradeAmount} SOL\n`);

  // Initialize components
  const rpcUrl = CONFIG.network === 'devnet'
    ? 'https://api.devnet.solana.com'
    : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  const tracker = new WalletTracker(rpcUrl);
  tracker.loadWallets();

  const walletManager = new WalletManager(rpcUrl);

  // Load wallet from environment variable (if available)
  if (process.env.WALLET_PRIVATE_KEY) {
    try {
      walletManager.loadWallet(process.env.WALLET_PRIVATE_KEY);
      console.log(`✅ Wallet loaded: ${walletManager.getPublicKey()}`);

      const balance = await walletManager.getBalance();
      console.log(`💰 Balance: ${balance.toFixed(4)} SOL`);

      if (balance < CONFIG.minWalletBalance) {
        console.warn(`⚠️  WARNING: Low balance! Minimum recommended: ${CONFIG.minWalletBalance} SOL\n`);
      } else {
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Failed to load wallet: ${error.message}`);
      console.log('💡 Set WALLET_PRIVATE_KEY in .env file\n');
    }
  } else {
    console.log('⚠️  No wallet configured (WALLET_PRIVATE_KEY not set)');
    console.log('💡 Bot will run in simulation mode');
    console.log('💡 See examples/wallet-setup.js to create a wallet\n');
  }

  // Create trading bot
  const bot = new TradingBot(tracker, walletManager, {
    enabled: CONFIG.enabled,
    dryRun: CONFIG.dryRun,
    maxTradeAmount: CONFIG.maxTradeAmount,
    minWalletBalance: CONFIG.minWalletBalance,
    copyRatio: CONFIG.copyRatio,
    monitorOptions: {
      pollInterval: CONFIG.pollInterval,
      largeTransactionThreshold: CONFIG.largeTransactionThreshold
    }
  });

  // Strategy 1: Copy whale's trades
  bot.registerStrategy('copy-whale', TradingStrategies.copyTrading('whale', {
    minAmount: 1  // Only copy trades >= 1 SOL
  }));

  // Strategy 2: Follow large transactions from gremlin
  bot.registerStrategy('follow-gremlin', TradingStrategies.whaleFollower(10, {
    fixedAmount: 0.05  // Always trade 0.05 SOL when triggered
  }));

  // Strategy 3: Snipe tokens bought by good_trader
  bot.registerStrategy('snipe-good-trader', TradingStrategies.tokenSniper(['good_trader'], {
    fixedAmount: 0.05  // Use 0.05 SOL for token buys
  }));

  // Custom Strategy: Alert on any transaction from Ansem
  bot.registerStrategy('ansem-alert', {
    condition: async (alert, bot) => {
      return alert.wallet.name === 'Ansem' &&
             alert.type === AlertType.TRANSACTION_RECEIVED;
    },
    action: async (alert, bot) => {
      console.log(`\n📢 ANSEM ACTIVITY DETECTED!`);
      console.log(`   Amount: ${alert.transaction.amount} SOL`);
      console.log(`   Signature: ${alert.transaction.signature.substring(0, 30)}...`);

      // Return null to not execute a trade (just alert)
      return null;
    }
  });

  // Event listeners
  bot.on('trade', (trade) => {
    console.log(`\n💼 Trade recorded:`);
    console.log(`   Strategy: ${trade.strategy}`);
    console.log(`   ${trade.dryRun ? 'Simulated' : 'Executed'}`);
    console.log(`   Time: ${new Date(trade.timestamp).toLocaleTimeString()}`);
  });

  bot.on('error', ({ strategy, error, alert }) => {
    console.error(`\n❌ Error in strategy ${strategy}:`, error.message);
  });

  // Stats display
  setInterval(() => {
    const stats = bot.getStats();
    console.log(`\n📊 Bot Stats: ${stats.totalTrades} trades, ${stats.successRate} success rate`);
  }, 60000); // Every minute

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down bot...');
    bot.stop();

    const stats = bot.getStats();
    console.log('\n📈 Final Statistics:');
    console.log(`   Total Trades: ${stats.totalTrades}`);
    console.log(`   Executed: ${stats.tradesExecuted}`);
    console.log(`   Simulated: ${stats.tradesSimulated}`);
    console.log(`   Volume: ${stats.totalVolume.toFixed(4)} SOL`);
    console.log(`   Success Rate: ${stats.successRate}`);

    process.exit(0);
  });

  // Start the bot
  console.log('🚀 Starting bot...');
  console.log('Press Ctrl+C to stop\n');

  if (!CONFIG.enabled) {
    console.log('⏸️  Bot is PAUSED - will monitor but not trade');
    console.log('💡 Set CONFIG.enabled = true to activate trading\n');
  }

  if (CONFIG.dryRun) {
    console.log('🧪 DRY RUN mode - trades will be simulated');
    console.log('💡 Set CONFIG.dryRun = false for live trading (RISKY!)\n');
  }

  await bot.start();

  console.log('✅ Bot is running! Monitoring wallets for opportunities...\n');

  // Show monitored wallets
  console.log('📋 Strategies active:');
  for (const [name, strategy] of bot.strategies) {
    console.log(`   - ${name}`);
  }
  console.log('');
}

main().catch(console.error);
