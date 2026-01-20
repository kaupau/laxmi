import { EventEmitter } from 'events';

/**
 * Alert types
 */
export const AlertType = {
  TRANSACTION_RECEIVED: 'TRANSACTION_RECEIVED',
  TRANSACTION_SENT: 'TRANSACTION_SENT',
  BALANCE_CHANGE: 'BALANCE_CHANGE',
  TOKEN_TRANSFER: 'TOKEN_TRANSFER',
  LARGE_TRANSACTION: 'LARGE_TRANSACTION',
  NEW_TRANSACTION: 'NEW_TRANSACTION'
};

/**
 * WalletMonitor - Real-time wallet monitoring and alerting
 */
export class WalletMonitor extends EventEmitter {
  constructor(tracker, options = {}) {
    super();
    this.tracker = tracker;
    this.options = {
      pollInterval: options.pollInterval || 10000, // 10 seconds
      largeTransactionThreshold: options.largeTransactionThreshold || 10, // 10 SOL
      ...options
    };

    this.isMonitoring = false;
    this.lastChecked = new Map(); // wallet -> last signature
    this.lastBalances = new Map(); // wallet -> balance
    this.webhooks = [];
    this.filters = new Map(); // wallet -> filters
  }

  /**
   * Register a webhook for alerts
   */
  registerWebhook(config) {
    this.webhooks.push({
      url: config.url,
      events: config.events || Object.values(AlertType),
      wallets: config.wallets || 'all',
      filters: config.filters || {},
      headers: config.headers || {}
    });
  }

  /**
   * Add custom alert filter
   */
  addFilter(walletName, filterFn) {
    this.filters.set(walletName, filterFn);
  }

  /**
   * Start monitoring wallets
   */
  async start() {
    if (this.isMonitoring) {
      return;
    }

    console.log('🔍 Starting wallet monitor...');
    this.isMonitoring = true;

    // Initialize last checked state
    for (const wallet of this.tracker.wallets) {
      const txs = await this.tracker.getRecentTransactions(wallet.trackedWalletAddress, 1);
      if (txs.length > 0) {
        this.lastChecked.set(wallet.name, txs[0].signature);
      }

      const balance = await this.tracker.getBalance(wallet.trackedWalletAddress);
      this.lastBalances.set(wallet.name, balance);
    }

    this._monitorLoop();
    console.log(`✅ Monitoring ${this.tracker.wallets.length} wallets`);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    console.log('🛑 Wallet monitor stopped');
  }

  /**
   * Main monitoring loop
   */
  async _monitorLoop() {
    while (this.isMonitoring) {
      try {
        await this._checkAllWallets();
      } catch (error) {
        console.error('Monitor error:', error.message);
        this.emit('error', error);
      }

      await new Promise(resolve => setTimeout(resolve, this.options.pollInterval));
    }
  }

  /**
   * Check all wallets for changes
   */
  async _checkAllWallets() {
    for (const wallet of this.tracker.wallets) {
      await this._checkWallet(wallet);
    }
  }

  /**
   * Check single wallet for changes
   */
  async _checkWallet(wallet) {
    // Check for new transactions
    const txs = await this.tracker.getRecentTransactions(wallet.trackedWalletAddress, 5);

    const lastSig = this.lastChecked.get(wallet.name);
    const newTransactions = [];

    for (const tx of txs) {
      if (tx.signature === lastSig) break;
      newTransactions.push(tx);
    }

    if (newTransactions.length > 0) {
      this.lastChecked.set(wallet.name, txs[0].signature);

      // Process each new transaction
      for (const tx of newTransactions.reverse()) {
        await this._processTransaction(wallet, tx);
      }
    }

    // Check balance changes
    await this._checkBalanceChange(wallet);
  }

  /**
   * Process a new transaction
   */
  async _processTransaction(wallet, tx) {
    try {
      const details = await this.tracker.getTransactionDetails(tx.signature);

      const alert = {
        type: AlertType.NEW_TRANSACTION,
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString(),
        wallet: {
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji
        },
        transaction: {
          signature: tx.signature,
          slot: tx.slot,
          success: details.success,
          fee: details.fee,
          balanceChanges: details.balanceChanges,
          tokenTransfers: details.tokenTransfers
        }
      };

      // Determine transaction direction
      const walletChange = details.balanceChanges[wallet.trackedWalletAddress] || 0;
      if (walletChange > 0) {
        alert.type = AlertType.TRANSACTION_RECEIVED;
        alert.transaction.amount = walletChange;
      } else if (walletChange < 0) {
        alert.type = AlertType.TRANSACTION_SENT;
        alert.transaction.amount = Math.abs(walletChange);
      }

      // Check for large transaction
      if (Math.abs(walletChange) >= this.options.largeTransactionThreshold) {
        const largeAlert = { ...alert, type: AlertType.LARGE_TRANSACTION };
        this._emitAlert(wallet, largeAlert);
      }

      // Check for token transfers
      if (details.tokenTransfers.length > 0) {
        const tokenAlert = { ...alert, type: AlertType.TOKEN_TRANSFER };
        this._emitAlert(wallet, tokenAlert);
      }

      this._emitAlert(wallet, alert);
    } catch (error) {
      console.error(`Error processing transaction ${tx.signature}:`, error.message);
    }
  }

  /**
   * Check for balance changes
   */
  async _checkBalanceChange(wallet) {
    const newBalance = await this.tracker.getBalance(wallet.trackedWalletAddress);
    const oldBalance = this.lastBalances.get(wallet.name);

    if (oldBalance !== undefined && Math.abs(newBalance - oldBalance) > 0.0001) {
      const alert = {
        type: AlertType.BALANCE_CHANGE,
        timestamp: new Date().toISOString(),
        wallet: {
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji
        },
        balance: {
          old: oldBalance,
          new: newBalance,
          change: newBalance - oldBalance
        }
      };

      this.lastBalances.set(wallet.name, newBalance);
      this._emitAlert(wallet, alert);
    } else if (oldBalance === undefined) {
      this.lastBalances.set(wallet.name, newBalance);
    }
  }

  /**
   * Emit alert to all listeners and webhooks
   */
  _emitAlert(wallet, alert) {
    // Apply custom filters
    const filter = this.filters.get(wallet.name);
    if (filter && !filter(alert)) {
      return;
    }

    // Check wallet alert settings
    if (!this._shouldAlert(wallet, alert)) {
      return;
    }

    // Emit to event listeners
    this.emit('alert', alert);
    this.emit(alert.type, alert);

    // Send to webhooks
    this._sendWebhooks(alert);
  }

  /**
   * Check if alert should be sent based on wallet config
   */
  _shouldAlert(wallet, alert) {
    // Use wallet config to determine if alert should be sent
    // For now, use the alertsOnFeed setting
    return wallet.alertsOnFeed !== false;
  }

  /**
   * Send alert to webhooks
   */
  async _sendWebhooks(alert) {
    for (const webhook of this.webhooks) {
      // Check if this webhook wants this event type
      if (!webhook.events.includes(alert.type)) {
        continue;
      }

      // Check if this webhook wants this wallet
      if (webhook.wallets !== 'all' && !webhook.wallets.includes(alert.wallet.name)) {
        continue;
      }

      // Check filters
      if (webhook.filters.minAmount && alert.transaction?.amount < webhook.filters.minAmount) {
        continue;
      }

      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...webhook.headers
          },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error(`Webhook error (${webhook.url}):`, error.message);
      }
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      walletsMonitored: this.tracker.wallets.length,
      pollInterval: this.options.pollInterval,
      webhooksRegistered: this.webhooks.length,
      lastChecked: Object.fromEntries(this.lastChecked),
      currentBalances: Object.fromEntries(this.lastBalances)
    };
  }
}

/**
 * Simple alert logger
 */
export class AlertLogger {
  constructor(outputPath = null) {
    this.outputPath = outputPath;
    this.alerts = [];
  }

  log(alert) {
    this.alerts.push({
      ...alert,
      loggedAt: new Date().toISOString()
    });

    const summary = this._formatAlert(alert);
    console.log(summary);

    if (this.outputPath) {
      // Write to file
      const fs = require('fs');
      fs.appendFileSync(this.outputPath, summary + '\n');
    }
  }

  _formatAlert(alert) {
    const time = new Date(alert.timestamp).toLocaleTimeString();
    const wallet = `${alert.wallet.emoji} ${alert.wallet.name}`;

    switch (alert.type) {
      case AlertType.TRANSACTION_RECEIVED:
        return `[${time}] ${wallet} ← Received ${alert.transaction.amount.toFixed(4)} SOL`;

      case AlertType.TRANSACTION_SENT:
        return `[${time}] ${wallet} → Sent ${alert.transaction.amount.toFixed(4)} SOL`;

      case AlertType.LARGE_TRANSACTION:
        return `[${time}] 🚨 ${wallet} Large transaction: ${alert.transaction.amount.toFixed(4)} SOL`;

      case AlertType.TOKEN_TRANSFER:
        return `[${time}] ${wallet} 🪙 Token transfer detected`;

      case AlertType.BALANCE_CHANGE:
        const change = alert.balance.change;
        const sign = change > 0 ? '+' : '';
        return `[${time}] ${wallet} Balance: ${alert.balance.old.toFixed(4)} → ${alert.balance.new.toFixed(4)} (${sign}${change.toFixed(4)} SOL)`;

      default:
        return `[${time}] ${wallet} ${alert.type}`;
    }
  }

  getAlerts() {
    return this.alerts;
  }

  clear() {
    this.alerts = [];
  }
}

export default WalletMonitor;
