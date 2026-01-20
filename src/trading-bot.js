import { WalletMonitor, AlertType } from './alerts.js';
import { WalletManager } from './wallet.js';
import { EventEmitter } from 'events';

/**
 * TradingBot - Automated trading based on wallet monitoring
 *
 * WARNING: Trading bots involve financial risk!
 * - Test on devnet first
 * - Start with small amounts
 * - Use stop-loss limits
 * - Monitor bot performance
 * - Never trade more than you can afford to lose
 */
export class TradingBot extends EventEmitter {
  constructor(tracker, walletManager, options = {}) {
    super();
    this.tracker = tracker;
    this.walletManager = walletManager;
    this.monitor = new WalletMonitor(tracker, options.monitorOptions || {});

    this.options = {
      enabled: false,
      dryRun: true,  // Simulate trades without executing
      maxTradeAmount: 0.1,  // Maximum SOL per trade
      minWalletBalance: 0.05,  // Minimum balance to maintain
      copyRatio: 0.1,  // 10% of tracked wallet's trade size
      ...options
    };

    this.strategies = new Map();
    this.tradeHistory = [];
    this.stats = {
      tradesExecuted: 0,
      tradesSimulated: 0,
      totalVolume: 0,
      successRate: 0
    };
  }

  /**
   * Register a trading strategy
   */
  registerStrategy(name, strategy) {
    this.strategies.set(name, {
      name,
      enabled: true,
      condition: strategy.condition,  // Function that returns true/false
      action: strategy.action,        // Function to execute trade
      config: strategy.config || {}
    });

    console.log(`📋 Registered strategy: ${name}`);
  }

  /**
   * Enable/disable bot
   */
  setEnabled(enabled) {
    this.options.enabled = enabled;
    console.log(`🤖 Trading bot ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Set dry run mode
   */
  setDryRun(dryRun) {
    this.options.dryRun = dryRun;
    console.log(`${dryRun ? '🧪' : '💰'} ${dryRun ? 'DRY RUN' : 'LIVE TRADING'} mode`);
  }

  /**
   * Start the trading bot
   */
  async start() {
    console.log('\n🚀 Starting Trading Bot...');
    console.log(`Mode: ${this.options.dryRun ? '🧪 DRY RUN (simulated)' : '💰 LIVE TRADING'}`);
    console.log(`Status: ${this.options.enabled ? '✅ ENABLED' : '⏸️  PAUSED'}`);
    console.log(`Max Trade: ${this.options.maxTradeAmount} SOL`);
    console.log(`Strategies: ${this.strategies.size}`);

    // Check wallet balance
    if (this.walletManager.wallet) {
      const balance = await this.walletManager.getBalance();
      console.log(`Wallet: ${this.walletManager.getPublicKey()}`);
      console.log(`Balance: ${balance.toFixed(4)} SOL\n`);

      if (balance < this.options.minWalletBalance) {
        console.warn(`⚠️  WARNING: Low balance! Consider adding more SOL.`);
      }
    } else {
      console.warn('⚠️  No wallet loaded. Bot will run in simulation mode only.\n');
    }

    // Set up alert listeners
    this.monitor.on('alert', async (alert) => {
      await this._processAlert(alert);
    });

    // Start monitoring
    await this.monitor.start();
  }

  /**
   * Stop the bot
   */
  stop() {
    this.monitor.stop();
    console.log('🛑 Trading bot stopped');
    this._printStats();
  }

  /**
   * Process incoming alerts
   */
  async _processAlert(alert) {
    if (!this.options.enabled) {
      return;
    }

    // Check each strategy
    for (const [name, strategy] of this.strategies) {
      if (!strategy.enabled) continue;

      try {
        // Check if strategy condition is met
        const shouldTrade = await strategy.condition(alert, this);

        if (shouldTrade) {
          console.log(`\n🎯 Strategy triggered: ${name}`);
          console.log(`Alert: ${alert.type} from ${alert.wallet.emoji} ${alert.wallet.name}`);

          // Execute trade action
          await this._executeTrade(name, strategy, alert);
        }
      } catch (error) {
        console.error(`❌ Strategy error (${name}):`, error.message);
        this.emit('error', { strategy: name, error, alert });
      }
    }
  }

  /**
   * Execute a trade
   */
  async _executeTrade(strategyName, strategy, alert) {
    // Safety checks
    if (!this.walletManager.wallet && !this.options.dryRun) {
      console.error('❌ Cannot trade: No wallet loaded');
      return;
    }

    if (!this.options.dryRun) {
      const balance = await this.walletManager.getBalance();
      if (balance < this.options.minWalletBalance) {
        console.error('❌ Cannot trade: Insufficient balance');
        return;
      }
    }

    try {
      // Get trade parameters from strategy
      const tradeParams = await strategy.action(alert, this);

      if (!tradeParams) {
        return; // Strategy decided not to trade
      }

      // Validate trade params
      if (tradeParams.amount > this.options.maxTradeAmount) {
        console.warn(`⚠️  Trade amount ${tradeParams.amount} exceeds max ${this.options.maxTradeAmount}`);
        tradeParams.amount = this.options.maxTradeAmount;
      }

      // Execute or simulate trade
      const trade = {
        strategy: strategyName,
        timestamp: new Date().toISOString(),
        alert,
        params: tradeParams,
        dryRun: this.options.dryRun
      };

      if (this.options.dryRun) {
        // Simulate trade
        console.log('🧪 SIMULATED TRADE:');
        console.log(`   Action: ${tradeParams.action}`);
        console.log(`   Amount: ${tradeParams.amount} SOL`);
        if (tradeParams.tokenMint) {
          console.log(`   Token: ${tradeParams.tokenMint.substring(0, 20)}...`);
        }

        trade.result = {
          simulated: true,
          success: true
        };

        this.stats.tradesSimulated++;
      } else {
        // Execute real trade
        console.log('💰 EXECUTING TRADE:');
        console.log(`   Action: ${tradeParams.action}`);
        console.log(`   Amount: ${tradeParams.amount} SOL`);

        const result = await this._executeRealTrade(tradeParams);
        trade.result = result;

        if (result.success) {
          console.log(`✅ Trade successful: ${result.signature}`);
          this.stats.tradesExecuted++;
          this.stats.totalVolume += tradeParams.amount;
        } else {
          console.log(`❌ Trade failed: ${result.error}`);
        }
      }

      // Record trade
      this.tradeHistory.push(trade);
      this.emit('trade', trade);

    } catch (error) {
      console.error('❌ Trade execution error:', error.message);
      this.emit('error', { strategy: strategyName, error, alert });
    }
  }

  /**
   * Execute real trade (implement based on your needs)
   */
  async _executeRealTrade(params) {
    // This is a placeholder. Implement based on your trading needs:
    // - SOL transfers: walletManager.sendSol()
    // - Token swaps: Jupiter integration
    // - Other DeFi operations

    if (params.action === 'send_sol') {
      const result = await this.walletManager.sendSol(params.to, params.amount);
      return result;
    }

    // Extend with more trade types
    throw new Error(`Unsupported trade action: ${params.action}`);
  }

  /**
   * Get trading statistics
   */
  getStats() {
    const successRate = this.tradeHistory.length > 0
      ? (this.tradeHistory.filter(t => t.result?.success).length / this.tradeHistory.length) * 100
      : 0;

    return {
      ...this.stats,
      successRate: successRate.toFixed(2) + '%',
      totalTrades: this.tradeHistory.length,
      recentTrades: this.tradeHistory.slice(-10)
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit = 50) {
    return this.tradeHistory.slice(-limit);
  }

  /**
   * Print statistics
   */
  _printStats() {
    console.log('\n📊 Trading Bot Statistics:');
    console.log(`   Trades Executed: ${this.stats.tradesExecuted}`);
    console.log(`   Trades Simulated: ${this.stats.tradesSimulated}`);
    console.log(`   Total Volume: ${this.stats.totalVolume.toFixed(4)} SOL`);

    const stats = this.getStats();
    console.log(`   Success Rate: ${stats.successRate}`);
    console.log(`   Total Strategies: ${this.strategies.size}`);
  }
}

/**
 * Pre-built trading strategies
 */
export const TradingStrategies = {
  /**
   * Copy Trading - Mirror transactions from tracked wallets
   */
  copyTrading: (targetWallet, options = {}) => ({
    condition: async (alert, bot) => {
      // Only trade on incoming transactions from target wallet
      return alert.wallet.name === targetWallet &&
             alert.type === AlertType.TRANSACTION_RECEIVED &&
             alert.transaction.amount > (options.minAmount || 0);
    },
    action: async (alert, bot) => {
      const copyAmount = alert.transaction.amount * bot.options.copyRatio;

      return {
        action: 'copy_trade',
        amount: Math.min(copyAmount, bot.options.maxTradeAmount),
        originalAmount: alert.transaction.amount,
        targetWallet: alert.wallet.name
      };
    },
    config: options
  }),

  /**
   * Large Transaction Follower - Trade when whales make big moves
   */
  whaleFollower: (threshold = 10, options = {}) => ({
    condition: async (alert, bot) => {
      return alert.type === AlertType.LARGE_TRANSACTION &&
             alert.transaction.amount >= threshold;
    },
    action: async (alert, bot) => {
      return {
        action: 'follow_whale',
        amount: options.fixedAmount || bot.options.maxTradeAmount,
        whaleAmount: alert.transaction.amount,
        wallet: alert.wallet.name
      };
    },
    config: { threshold, ...options }
  }),

  /**
   * Token Sniper - Buy tokens when tracked wallets buy them
   */
  tokenSniper: (targetWallets = [], options = {}) => ({
    condition: async (alert, bot) => {
      return (targetWallets.length === 0 || targetWallets.includes(alert.wallet.name)) &&
             alert.type === AlertType.TOKEN_TRANSFER &&
             alert.transaction.tokenTransfers?.length > 0;
    },
    action: async (alert, bot) => {
      const tokenTransfer = alert.transaction.tokenTransfers[0];

      // Only buy if wallet is buying (positive amount)
      if (tokenTransfer.amount <= 0) {
        return null;
      }

      return {
        action: 'buy_token',
        tokenMint: tokenTransfer.mint,
        amount: options.fixedAmount || (bot.options.maxTradeAmount * 0.5),
        wallet: alert.wallet.name
      };
    },
    config: options
  }),

  /**
   * Stop Loss - Sell when price drops below threshold
   */
  stopLoss: (stopLossPercent = 10, options = {}) => ({
    condition: async (alert, bot) => {
      // Implement your stop-loss logic
      // This is a placeholder
      return false;
    },
    action: async (alert, bot) => {
      return {
        action: 'stop_loss_sell',
        amount: options.amount || 0
      };
    },
    config: { stopLossPercent, ...options }
  })
};

export default TradingBot;
