import { WalletTracker } from '../src/tracker.js';

/**
 * Quick test of new features without hitting rate limits
 */
async function main() {
  console.log('🧪 Quick Feature Test\n');

  const tracker = new WalletTracker();
  tracker.loadWallets();

  // Test 1: Get detailed wallet info
  console.log('Test 1: Get wallet info');
  console.log('-'.repeat(50));
  const info = await tracker.getWalletInfo('whale');
  console.log(`${info.emoji} ${info.name}`);
  console.log(`Address: ${info.address}`);
  console.log(`Balance: ${info.balanceFormatted}`);
  console.log(`Has metadata: ${info.metadata ? '✅' : '❌'}\n`);

  // Small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Get transaction history (signatures only)
  console.log('Test 2: Get recent transaction signatures');
  console.log('-'.repeat(50));
  const history = await tracker.getTransactionHistory('whale', 2);
  console.log(`Wallet: ${history.emoji} ${history.name}`);
  console.log(`Recent transactions: ${history.transactions.length}`);
  history.transactions.forEach((tx, i) => {
    console.log(`  ${i + 1}. ${tx.signature.substring(0, 40)}...`);
    console.log(`     Time: ${tx.timestamp}`);
  });
  console.log();

  // Small delay
  await new Promise(r => setTimeout(r, 1000));

  // Test 3: Get one detailed transaction (careful with rate limits)
  console.log('Test 3: Detailed transaction (1 transaction)');
  console.log('-'.repeat(50));
  try {
    const sig = history.transactions[0].signature;
    console.log(`Analyzing: ${sig.substring(0, 40)}...`);

    const details = await tracker.getTransactionDetails(sig);
    console.log(`Status: ${details.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Fee: ${details.fee.toFixed(6)} SOL`);
    console.log(`SOL balance changes: ${Object.keys(details.balanceChanges).length} accounts`);
    console.log(`Token transfers: ${details.tokenTransfers.length}`);

    // Show first balance change if any
    const firstChange = Object.entries(details.balanceChanges)[0];
    if (firstChange) {
      const [addr, change] = firstChange;
      console.log(`Example change: ${addr.substring(0, 20)}... ${change > 0 ? '+' : ''}${change.toFixed(6)} SOL`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    if (error.message.includes('429')) {
      console.log('💡 Tip: Use a premium RPC endpoint to avoid rate limits');
    }
  }

  console.log('\n✅ Feature test complete!');
  console.log('\n📝 Features tested:');
  console.log('   ✅ Wallet info retrieval');
  console.log('   ✅ Transaction history');
  console.log('   ✅ Detailed transaction parsing');
  console.log('\n📚 See API.md and EXTENSIONS.md for full documentation');
}

main().catch(console.error);
