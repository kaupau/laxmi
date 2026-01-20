import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { WalletTracker } from './tracker.js';

describe('WalletTracker', () => {
  let tracker;

  before(() => {
    tracker = new WalletTracker();
    tracker.loadWallets();
  });

  it('should load wallets from config', () => {
    assert.ok(tracker.wallets.length > 0, 'Should load wallets');
    assert.strictEqual(tracker.wallets.length, 12, 'Should load 12 wallets');
  });

  it('should find wallet by name', () => {
    const whale = tracker.getWalletByName('whale');
    assert.ok(whale, 'Should find whale wallet');
    assert.strictEqual(whale.name, 'whale');
    assert.strictEqual(whale.emoji, '🐳');
    assert.strictEqual(whale.trackedWalletAddress, 'HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp');
  });

  it('should find wallet by name (case insensitive)', () => {
    const ansem = tracker.getWalletByName('ANSEM');
    assert.ok(ansem, 'Should find Ansem wallet');
    assert.strictEqual(ansem.name, 'Ansem');
  });

  it('should get balance for a wallet', async () => {
    const balance = await tracker.getBalance('HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp');
    assert.ok(typeof balance === 'number', 'Balance should be a number');
    assert.ok(balance >= 0, 'Balance should be non-negative');
    console.log(`   🐳 whale balance: ${balance.toFixed(4)} SOL`);
  });

  it('should get wallet info by name', async () => {
    const info = await tracker.getWalletInfo('whale');
    assert.ok(info, 'Should get wallet info');
    assert.strictEqual(info.name, 'whale');
    assert.strictEqual(info.emoji, '🐳');
    assert.ok(typeof info.balance === 'number', 'Should have balance');
    assert.ok(info.balanceFormatted.includes('SOL'), 'Should have formatted balance');
    console.log(`   ${info.emoji} ${info.name}: ${info.balanceFormatted}`);
  });

  it('should get wallet info by address', async () => {
    const info = await tracker.getWalletInfo('HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp');
    assert.ok(info, 'Should get wallet info');
    assert.strictEqual(info.name, 'whale');
    assert.ok(typeof info.balance === 'number', 'Should have balance');
  });

  it('should get LLM-friendly wallet summary', async () => {
    const summary = await tracker.getWalletSummary('Ansem');
    assert.ok(summary, 'Should get summary');
    assert.ok(summary.includes('Ansem'), 'Should include wallet name');
    assert.ok(summary.includes('SOL'), 'Should include SOL');
    assert.ok(summary.includes('👻'), 'Should include emoji');
    console.log(`   Summary: ${summary}`);
  });

  it('should get recent transactions', async () => {
    const history = await tracker.getTransactionHistory('whale', 3);
    assert.ok(history, 'Should get transaction history');
    assert.strictEqual(history.name, 'whale');
    assert.ok(Array.isArray(history.transactions), 'Should have transactions array');
    console.log(`   📜 Found ${history.transactions.length} recent transactions for ${history.emoji} ${history.name}`);
    if (history.transactions.length > 0) {
      console.log(`   Latest tx: ${history.transactions[0].signature.substring(0, 20)}...`);
    }
  });

  it('should get all wallets summary', async () => {
    console.log('   Fetching all wallets info (this may take a moment)...');
    const summary = await tracker.getAllWalletsSummary();
    assert.ok(summary, 'Should get summary');
    assert.ok(summary.includes('Wallet Tracker Summary'), 'Should include title');
    assert.ok(summary.includes('Total Balance'), 'Should include total');
    console.log('\n' + summary);
  });
});
