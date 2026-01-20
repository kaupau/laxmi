import { WalletTracker } from '../src/tracker.js';

/**
 * Example: Get detailed transaction information
 */
async function main() {
  console.log('🔍 Detailed Transaction Analysis Example\n');

  const tracker = new WalletTracker();
  tracker.loadWallets();

  // Get recent transactions
  console.log('Fetching recent transactions for whale wallet...');
  const history = await tracker.getTransactionHistory('whale', 3);

  console.log(`\nFound ${history.transactions.length} recent transactions:\n`);

  // Get details for each transaction
  for (const tx of history.transactions) {
    console.log('='.repeat(80));
    console.log(`Transaction: ${tx.signature}`);
    console.log(`Time: ${tx.timestamp}`);
    console.log('-'.repeat(80));

    try {
      const details = await tracker.getTransactionDetails(tx.signature);

      console.log(`Status: ${details.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`Fee: ${details.fee.toFixed(6)} SOL`);
      console.log(`Slot: ${details.slot}`);

      // Show balance changes
      if (Object.keys(details.balanceChanges).length > 0) {
        console.log('\n💰 SOL Balance Changes:');
        Object.entries(details.balanceChanges).forEach(([addr, change]) => {
          const sign = change > 0 ? '+' : '';
          const color = change > 0 ? '🟢' : '🔴';
          console.log(`  ${color} ${addr.substring(0, 20)}... ${sign}${change.toFixed(6)} SOL`);
        });
      }

      // Show token transfers
      if (details.tokenTransfers.length > 0) {
        console.log('\n🪙 Token Transfers:');
        details.tokenTransfers.forEach((transfer, i) => {
          const direction = transfer.amount > 0 ? 'Received' : 'Sent';
          console.log(`  ${i + 1}. ${direction} ${Math.abs(transfer.amount)} tokens`);
          console.log(`     Mint: ${transfer.mint}`);
          console.log(`     Owner: ${transfer.owner}`);
        });
      }

      // Show all account balances
      console.log('\n📊 Account Balances (non-zero changes):');
      details.accountBalances
        .filter(bal => Math.abs(bal.change) > 0.000001)
        .forEach(bal => {
          const sign = bal.change > 0 ? '+' : '';
          console.log(`  ${bal.address.substring(0, 20)}... ${sign}${bal.change.toFixed(6)} SOL`);
        });

      // Get LLM-friendly summary
      console.log('\n🤖 LLM Summary:');
      const summary = await tracker.getTransactionSummary(tx.signature);
      console.log(summary);

    } catch (error) {
      console.log(`Error fetching details: ${error.message}`);
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);
