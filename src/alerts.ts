import { EventEmitter } from 'events';
import type { WalletTracker } from './tracker.js';
import type { WalletConfig } from './types/wallet.js';
import {
  AlertType,
  type Alert,
  type TransactionAlert,
  type BalanceChangeAlert,
  type WebhookConfig,
  type MonitorOptions,
  type MonitorStats,
} from './types/alerts.js';

/**
 * WalletMonitor - Real-time wallet monitoring and alerting
 */
export class WalletMonitor extends EventEmitter {
  private tracker: WalletTracker;
  private options: Required<MonitorOptions>;
  private isMonitoring: boolean = false;
  private lastChecked: Map<string, string> = new Map();
  private lastBalances: Map<string, number> = new Map();
  private webhooks: WebhookConfig[] = [];
  private filters: Map<string, (alert: Alert) => boolean> = new Map();

  constructor(tracker: WalletTracker, options: MonitorOptions = {}) {
    super();
    this.tracker = tracker;
    this.options = {
      pollInterval: options.pollInterval || 10000, // 10 seconds
      largeTransactionThreshold: options.largeTransactionThreshold || 10, // 10 SOL
    };
  }

  /**
   * Register a webhook for alerts
   */
  registerWebhook(config: Partial<WebhookConfig> & { url: string }): void {
    this.webhooks.push({
      url: config.url,
      events: config.events || Object.values(AlertType),
      wallets: config.wallets || 'all',
      filters: config.filters || {},
      headers: config.headers || {},
    });
  }

  /**
   * Add custom alert filter
   */
  addFilter(walletName: string, filterFn: (alert: Alert) => boolean): void {
    this.filters.set(walletName, filterFn);
  }

  /**
   * Start monitoring wallets
   */
  async start(): Promise<void> {
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
  stop(): void {
    this.isMonitoring = false;
    console.log('🛑 Wallet monitor stopped');
  }

  /**
   * Main monitoring loop
   */
  private async _monitorLoop(): Promise<void> {
    while (this.isMonitoring) {
      try {
        await this._checkAllWallets();
      } catch (error) {
        console.error('Monitor error:', (error as Error).message);
        this.emit('error', error);
      }

      await new Promise(resolve => setTimeout(resolve, this.options.pollInterval));
    }
  }

  /**
   * Check all wallets for changes
   */
  private async _checkAllWallets(): Promise<void> {
    for (const wallet of this.tracker.wallets) {
      await this._checkWallet(wallet);
    }
  }

  /**
   * Check single wallet for changes
   */
  private async _checkWallet(wallet: WalletConfig): Promise<void> {
    // Check for new transactions
    const txs = await this.tracker.getRecentTransactions(wallet.trackedWalletAddress, 5);

    const lastSig = this.lastChecked.get(wallet.name);
    const newTransactions: any[] = [];

    for (const tx of txs) {
      if (tx.signature === lastSig) break;
      newTransactions.push(tx);
    }

    console.log(`🔍 ${wallet.name}: Found ${txs.length} recent txs, ${newTransactions.length} new (last: ${lastSig?.slice(0, 8)}...)`);

    if (newTransactions.length > 0) {
      this.lastChecked.set(wallet.name, txs[0].signature);

      // Process each new transaction
      for (const tx of newTransactions.reverse()) {
        console.log(`  📝 Processing tx: ${tx.signature.slice(0, 8)}...`);
        await this._processTransaction(wallet, tx);
      }
    }

    // Check balance changes
    await this._checkBalanceChange(wallet);
  }

  /**
   * Process a new transaction
   */
  private async _processTransaction(wallet: WalletConfig, tx: any): Promise<void> {
    try {
      const details = await this.tracker.getTransactionDetails(tx.signature);

      const alert: TransactionAlert = {
        type: AlertType.NEW_TRANSACTION,
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString(),
        wallet: {
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji || '📍',
        },
        transaction: {
          signature: tx.signature,
          slot: tx.slot,
          success: details.success,
          fee: details.fee,
          balanceChanges: details.balanceChanges,
          tokenTransfers: details.tokenTransfers,
        },
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
        const largeAlert: TransactionAlert = { ...alert, type: AlertType.LARGE_TRANSACTION };
        this._emitAlert(wallet, largeAlert);
      }

      // Check for token transfers
      if (details.tokenTransfers.length > 0) {
        console.log(`  🪙 Token transfers detected: ${details.tokenTransfers.length}`);
        const tokenAlert: TransactionAlert = { ...alert, type: AlertType.TOKEN_TRANSFER };
        this._emitAlert(wallet, tokenAlert);
      }

      this._emitAlert(wallet, alert);
    } catch (error) {
      console.error(`Error processing transaction ${tx.signature}:`, (error as Error).message);
    }
  }

  /**
   * Check for balance changes
   */
  private async _checkBalanceChange(wallet: WalletConfig): Promise<void> {
    const newBalance = await this.tracker.getBalance(wallet.trackedWalletAddress);
    const oldBalance = this.lastBalances.get(wallet.name);

    if (oldBalance !== undefined && Math.abs(newBalance - oldBalance) > 0.0001) {
      const alert: BalanceChangeAlert = {
        type: AlertType.BALANCE_CHANGE,
        timestamp: new Date().toISOString(),
        wallet: {
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji || '📍',
        },
        balance: {
          old: oldBalance,
          new: newBalance,
          change: newBalance - oldBalance,
        },
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
  private _emitAlert(wallet: WalletConfig, alert: Alert): void {
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
  private _shouldAlert(wallet: WalletConfig, alert: Alert): boolean {
    // Use wallet config to determine if alert should be sent
    // For now, use the alertsOnFeed setting
    return wallet.alertsOnFeed !== false;
  }

  /**
   * Send alert to webhooks
   */
  private async _sendWebhooks(alert: Alert): Promise<void> {
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
      if ('transaction' in alert && webhook.filters.minAmount && alert.transaction?.amount && alert.transaction.amount < webhook.filters.minAmount) {
        continue;
      }

      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...webhook.headers,
          },
          body: JSON.stringify(alert),
        });
      } catch (error) {
        console.error(`Webhook error (${webhook.url}):`, (error as Error).message);
      }
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): MonitorStats {
    return {
      isMonitoring: this.isMonitoring,
      walletsMonitored: this.tracker.wallets.length,
      pollInterval: this.options.pollInterval,
      webhooksRegistered: this.webhooks.length,
      lastChecked: Object.fromEntries(this.lastChecked),
      currentBalances: Object.fromEntries(this.lastBalances),
    };
  }
}

/**
 * Simple alert logger
 */
export class AlertLogger {
  private outputPath: string | null;
  private alerts: (Alert & { loggedAt: string })[] = [];

  constructor(outputPath: string | null = null) {
    this.outputPath = outputPath;
  }

  log(alert: Alert): void {
    this.alerts.push({
      ...alert,
      loggedAt: new Date().toISOString(),
    });

    const summary = this._formatAlert(alert);
    console.log(summary);

    if (this.outputPath) {
      // Write to file
      const fs = require('fs');
      fs.appendFileSync(this.outputPath, summary + '\n');
    }
  }

  private _formatAlert(alert: Alert): string {
    const time = new Date(alert.timestamp).toLocaleTimeString();
    const wallet = `${alert.wallet.emoji} ${alert.wallet.name}`;

    switch (alert.type) {
      case AlertType.TRANSACTION_RECEIVED:
        return `[${time}] ${wallet} ← Received ${(alert as TransactionAlert).transaction.amount?.toFixed(4)} SOL`;

      case AlertType.TRANSACTION_SENT:
        return `[${time}] ${wallet} → Sent ${(alert as TransactionAlert).transaction.amount?.toFixed(4)} SOL`;

      case AlertType.LARGE_TRANSACTION:
        return `[${time}] 🚨 ${wallet} Large transaction: ${(alert as TransactionAlert).transaction.amount?.toFixed(4)} SOL`;

      case AlertType.TOKEN_TRANSFER:
        return `[${time}] ${wallet} 🪙 Token transfer detected`;

      case AlertType.BALANCE_CHANGE:
        const balanceAlert = alert as BalanceChangeAlert;
        const change = balanceAlert.balance.change;
        const sign = change > 0 ? '+' : '';
        return `[${time}] ${wallet} Balance: ${balanceAlert.balance.old.toFixed(4)} → ${balanceAlert.balance.new.toFixed(4)} (${sign}${change.toFixed(4)} SOL)`;

      default:
        return `[${time}] ${wallet} ${alert.type}`;
    }
  }

  getAlerts(): (Alert & { loggedAt: string })[] {
    return this.alerts;
  }

  clear(): void {
    this.alerts = [];
  }
}

export { AlertType };
export default WalletMonitor;
