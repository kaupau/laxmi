import { WalletTracker } from '../src/tracker.js';
import { WalletMonitor, AlertLogger, AlertType } from '../src/alerts.js';

/**
 * Example: Real-time wallet monitoring
 */
async function main() {
  console.log('🚀 Starting Wallet Monitor Example\n');

  // Initialize tracker
  const tracker = new WalletTracker();
  tracker.loadWallets();

  // Create monitor
  const monitor = new WalletMonitor(tracker, {
    pollInterval: 15000,              // Check every 15 seconds
    largeTransactionThreshold: 5      // Alert on 5+ SOL transactions
  });

  // Set up logger
  const logger = new AlertLogger();

  // Listen to all alerts
  monitor.on('alert', (alert) => {
    logger.log(alert);
  });

  // Listen to specific alert types
  monitor.on(AlertType.TRANSACTION_RECEIVED, (alert) => {
    console.log(`\n💰 INCOMING: ${alert.wallet.emoji} ${alert.wallet.name} received ${alert.transaction.amount.toFixed(4)} SOL`);
    console.log(`   Signature: ${alert.transaction.signature.substring(0, 30)}...`);
  });

  monitor.on(AlertType.TRANSACTION_SENT, (alert) => {
    console.log(`\n💸 OUTGOING: ${alert.wallet.emoji} ${alert.wallet.name} sent ${alert.transaction.amount.toFixed(4)} SOL`);
    console.log(`   Signature: ${alert.transaction.signature.substring(0, 30)}...`);
  });

  monitor.on(AlertType.LARGE_TRANSACTION, (alert) => {
    console.log(`\n🚨 LARGE TRANSACTION ALERT!`);
    console.log(`   Wallet: ${alert.wallet.emoji} ${alert.wallet.name}`);
    console.log(`   Amount: ${alert.transaction.amount.toFixed(4)} SOL`);
    console.log(`   Signature: ${alert.transaction.signature.substring(0, 30)}...`);
  });

  monitor.on(AlertType.TOKEN_TRANSFER, (alert) => {
    console.log(`\n🪙 TOKEN ACTIVITY: ${alert.wallet.emoji} ${alert.wallet.name}`);
    console.log(`   ${alert.transaction.tokenTransfers.length} token transfer(s) detected`);
  });

  monitor.on(AlertType.BALANCE_CHANGE, (alert) => {
    const sign = alert.balance.change > 0 ? '+' : '';
    console.log(`\n📊 BALANCE UPDATE: ${alert.wallet.emoji} ${alert.wallet.name}`);
    console.log(`   ${alert.balance.old.toFixed(4)} → ${alert.balance.new.toFixed(4)} SOL (${sign}${alert.balance.change.toFixed(4)})`);
  });

  // Add custom filter for whale wallet
  monitor.addFilter('whale', (alert) => {
    // Only alert if transaction is > 20 SOL
    if (alert.transaction && alert.transaction.amount < 20) {
      return false;
    }
    return true;
  });

  // Error handling
  monitor.on('error', (error) => {
    console.error('\n❌ Monitor error:', error.message);
  });

  // Show stats every minute
  setInterval(() => {
    const stats = monitor.getStats();
    console.log(`\n📈 Monitor Stats:`);
    console.log(`   Monitoring: ${stats.isMonitoring ? '✅' : '❌'}`);
    console.log(`   Wallets: ${stats.walletsMonitored}`);
    console.log(`   Poll Interval: ${stats.pollInterval}ms`);
    console.log(`   Total Alerts: ${logger.getAlerts().length}`);
  }, 60000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down monitor...');
    monitor.stop();

    console.log('\n📊 Final Stats:');
    console.log(`   Total alerts logged: ${logger.getAlerts().length}`);

    const alertTypes = logger.getAlerts().reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});

    console.log('\n   Alerts by type:');
    Object.entries(alertTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    process.exit(0);
  });

  // Start monitoring
  console.log('Starting monitor...');
  console.log('Monitoring settings:');
  console.log(`  - Poll interval: 15 seconds`);
  console.log(`  - Large transaction threshold: 5 SOL`);
  console.log(`  - Wallets tracked: ${tracker.wallets.length}`);
  console.log('\nPress Ctrl+C to stop monitoring\n');

  await monitor.start();

  console.log('\n✅ Monitor is now running. Watching for wallet activity...\n');
}

main().catch(console.error);
