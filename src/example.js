import { WalletTracker } from './tracker.js';

/**
 * Example usage of WalletTracker
 */
async function main() {
  console.log('🚀 Laxmi Wallet Tracker - Example Usage\n');

  // Initialize tracker
  const tracker = new WalletTracker();

  // Load wallets from config
  console.log('📂 Loading wallets...');
  tracker.loadWallets();
  console.log(`✅ Loaded ${tracker.wallets.length} wallets\n`);

  // Example 1: Get info for a specific wallet by name
  console.log('Example 1: Get wallet info by name');
  console.log('─'.repeat(50));
  const whaleInfo = await tracker.getWalletInfo('whale');
  console.log(`${whaleInfo.emoji} ${whaleInfo.name}`);
  console.log(`Address: ${whaleInfo.address}`);
  console.log(`Balance: ${whaleInfo.balanceFormatted}\n`);

  // Example 2: Get LLM-friendly summary
  console.log('Example 2: LLM-friendly wallet summary');
  console.log('─'.repeat(50));
  const summary = await tracker.getWalletSummary('Ansem');
  console.log(summary);
  console.log();

  // Example 3: Get recent transactions
  console.log('Example 3: Recent transactions');
  console.log('─'.repeat(50));
  const history = await tracker.getTransactionHistory('whale', 5);
  console.log(`${history.emoji} ${history.name} - Recent Transactions:`);
  history.transactions.forEach((tx, i) => {
    const time = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unknown';
    console.log(`  ${i + 1}. ${tx.signature.substring(0, 30)}... (${time})`);
  });
  console.log();

  // Example 4: Get all wallets summary
  console.log('Example 4: All wallets summary (LLM-optimized)');
  console.log('─'.repeat(50));
  const allSummary = await tracker.getAllWalletsSummary();
  console.log(allSummary);
  console.log();

  // Example 5: Check specific wallets
  console.log('Example 5: Check multiple wallets');
  console.log('─'.repeat(50));
  const walletsToCheck = ['whale', 'Ansem', 'good_trader'];
  for (const name of walletsToCheck) {
    const info = await tracker.getWalletInfo(name);
    console.log(`${info.emoji} ${info.name.padEnd(15)} ${info.balanceFormatted}`);
  }
  console.log();

  console.log('✨ Done!');
}

main().catch(console.error);
