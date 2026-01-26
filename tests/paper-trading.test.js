import { PaperTrading } from '../src/paper-trading.js';
import { strict as assert } from 'assert';
import fs from 'fs';

/**
 * Tests for PaperTrading class
 */

const TEST_FILE = './test-paper-trades.json';

// Clean up test file before and after tests
function cleanup() {
  if (fs.existsSync(TEST_FILE)) {
    fs.unlinkSync(TEST_FILE);
  }
}

console.log('🧪 Running Paper Trading Tests...\n');

// Test 1: Initialize with default values
console.log('Test 1: Initialize with default values');
cleanup();
const pt = new PaperTrading(TEST_FILE);
const initialPortfolio = pt.getPortfolio();
assert.equal(initialPortfolio.balance, 1.0, 'Initial balance should be 1.0 SOL');
assert.equal(Object.keys(initialPortfolio.tokens).length, 0, 'Should have no tokens initially');
assert.equal(pt.isEnabled(), false, 'Should be disabled by default');
console.log('✅ Passed\n');

// Test 2: Toggle enable/disable
console.log('Test 2: Toggle enable/disable');
assert.equal(pt.toggle(), true, 'First toggle should enable');
assert.equal(pt.isEnabled(), true, 'Should be enabled after toggle');
assert.equal(pt.toggle(), false, 'Second toggle should disable');
assert.equal(pt.isEnabled(), false, 'Should be disabled after second toggle');
console.log('✅ Passed\n');

// Test 3: Execute buy trade
console.log('Test 3: Execute buy trade');
pt.toggle(); // Enable
const buyResult = await pt.buy('TESTMINT123', 'TEST', 0.1, 0.001);
assert.equal(buyResult.success, true, 'Buy should succeed');
assert.equal(buyResult.trade.amountSOL, 0.1, 'Should spend 0.1 SOL');
assert.equal(buyResult.trade.tokensReceived, 100, 'Should receive 100 tokens at $0.001');
assert.equal(buyResult.portfolio.balance, 0.9, 'Balance should be 0.9 after spending 0.1');
assert.equal(Object.keys(buyResult.portfolio.tokens).length, 1, 'Should have 1 token');
console.log('✅ Passed\n');

// Test 4: Buy more of same token (average price)
console.log('Test 4: Buy more of same token (average price)');
const buyResult2 = await pt.buy('TESTMINT123', 'TEST', 0.2, 0.002);
const portfolio = pt.getPortfolio();
assert.equal(portfolio.balance, 0.7, 'Balance should be 0.7 after spending 0.3 total');
const holding = portfolio.tokens['TESTMINT123'];
assert.equal(holding.amount, 200, 'Should have 200 tokens total (100 + 100)');
// Average price = (0.1 + 0.2) / 200 = 0.0015
assert.equal(holding.avgPrice.toFixed(6), '0.001500', 'Average price should be correctly calculated');
console.log('✅ Passed\n');

// Test 5: Sell partial position
console.log('Test 5: Sell partial position');
const sellResult = await pt.sell('TESTMINT123', 100, 0.003);
assert.equal(sellResult.success, true, 'Sell should succeed');
assert.equal(sellResult.trade.solReceived, 0.3, 'Should receive 0.3 SOL (100 * 0.003)');
assert.equal(sellResult.trade.profit > 0, true, 'Should have profit');
const portfolioAfterSell = pt.getPortfolio();
assert.equal(portfolioAfterSell.balance, 1.0, 'Balance should be back to 1.0 SOL');
assert.equal(portfolioAfterSell.tokens['TESTMINT123'].amount, 100, 'Should have 100 tokens remaining');
console.log('✅ Passed\n');

// Test 6: Sell all position
console.log('Test 6: Sell all position');
const sellResult2 = await pt.sell('TESTMINT123', 100, 0.003);
const portfolioFinal = pt.getPortfolio();
assert.equal(portfolioFinal.balance, 1.3, 'Balance should be 1.3 SOL after selling all');
assert.equal(Object.keys(portfolioFinal.tokens).length, 0, 'Should have no tokens after selling all');
console.log('✅ Passed\n');

// Test 7: Track stats correctly
console.log('Test 7: Track stats correctly');
const stats = pt.getStats();
assert.equal(stats.totalTrades, 4, 'Should have 4 trades total (2 buys + 2 sells)');
assert.equal(stats.wins, 2, 'Should have 2 wins (both sells were profitable)');
assert.equal(stats.losses, 0, 'Should have 0 losses');
assert.equal(stats.currentValue, 1.3, 'Current value should be 1.3');
assert.equal(stats.totalReturn.toFixed(2), '0.30', 'Total return should be 0.3 SOL');
assert.equal(Math.round(stats.returnPercent), 30, 'Return percent should be 30%');
console.log('✅ Passed\n');

// Test 8: Insufficient balance
console.log('Test 8: Insufficient balance');
try {
  await pt.buy('TESTMINT456', 'TEST2', 2.0, 0.001);
  assert.fail('Should have thrown insufficient balance error');
} catch (error) {
  assert.equal(error.message.includes('Insufficient balance'), true, 'Should throw insufficient balance error');
}
console.log('✅ Passed\n');

// Test 9: Sell non-existent token
console.log('Test 9: Sell non-existent token');
try {
  await pt.sell('NONEXISTENT', 100, 0.001);
  assert.fail('Should have thrown no holdings error');
} catch (error) {
  assert.equal(error.message.includes('No holdings'), true, 'Should throw no holdings error');
}
console.log('✅ Passed\n');

// Test 10: Reset account
console.log('Test 10: Reset account');
const resetPortfolio = pt.reset(2.0);
assert.equal(resetPortfolio.balance, 2.0, 'Balance should be reset to 2.0');
assert.equal(Object.keys(resetPortfolio.tokens).length, 0, 'Should have no tokens after reset');
const statsAfterReset = pt.getStats();
assert.equal(statsAfterReset.totalTrades, 0, 'Stats should be reset');
console.log('✅ Passed\n');

// Test 11: Persistence (save and load)
console.log('Test 11: Persistence (save and load)');
await pt.buy('PERSISTENT', 'PERSIST', 0.5, 0.001);
const pt2 = new PaperTrading(TEST_FILE);
const loadedPortfolio = pt2.getPortfolio();
assert.equal(loadedPortfolio.balance, 1.5, 'Loaded balance should match');
assert.equal(Object.keys(loadedPortfolio.tokens).length, 1, 'Loaded tokens should match');
assert.equal(loadedPortfolio.tokens['PERSISTENT'].symbol, 'PERSIST', 'Token details should persist');
console.log('✅ Passed\n');

// Test 12: Trade history
console.log('Test 12: Trade history');
const history = pt2.getHistory(10);
assert.equal(Array.isArray(history), true, 'History should be an array');
assert.equal(history.length > 0, true, 'Should have trade history');
assert.equal(history[0].type, 'BUY', 'Latest trade should be a buy');
console.log('✅ Passed\n');

// Cleanup
cleanup();

console.log('✅ All Paper Trading tests passed!');
