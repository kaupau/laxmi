import { WalletTracker } from './src/tracker.js';

const tracker = new WalletTracker();
tracker.loadWallets();

console.log('🔍 Live Wallet Tracker Demo\n');
console.log('═'.repeat(60));

// Check top wallets
console.log('\n💎 Top Wallets by Balance\n');
const topWallets = ['whale', 'gremlin', 'good_trader', 'sniper'];
for (const name of topWallets) {
  const summary = await tracker.getWalletSummary(name);
  console.log(summary);
}

console.log('\n' + '═'.repeat(60));
console.log('\n📊 Complete Portfolio Overview\n');
const full = await tracker.getAllWalletsSummary();
console.log(full);

console.log('\n' + '═'.repeat(60));
console.log('\n📜 Recent Transaction History - Whale Wallet\n');
const history = await tracker.getTransactionHistory('whale', 5);
history.transactions.forEach((tx, i) => {
  const time = new Date(tx.timestamp).toLocaleTimeString();
  const date = new Date(tx.timestamp).toLocaleDateString();
  console.log(`${i+1}. ${tx.signature.substring(0, 50)}...`);
  console.log(`   ${date} at ${time}\n`);
});

console.log('═'.repeat(60));
console.log('\n✨ Query by Address Example\n');
const directQuery = await tracker.getWalletInfo('HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp');
console.log(`Found: ${directQuery.emoji} ${directQuery.name}`);
console.log(`Address: ${directQuery.address}`);
console.log(`Balance: ${directQuery.balanceFormatted}`);

console.log('\n' + '═'.repeat(60));
console.log('\n🤖 LLM-Friendly Output Examples\n');

console.log('Example 1: "What is Ansem\'s balance?"');
const ansemSummary = await tracker.getWalletSummary('Ansem');
console.log(`Answer: ${ansemSummary}\n`);

console.log('Example 2: "Show me all wallet balances"');
const allSummary = await tracker.getAllWalletsSummary();
console.log(`Answer:\n${allSummary}`);

console.log('\n' + '═'.repeat(60));
