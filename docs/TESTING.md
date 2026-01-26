# Testing Guide

This project includes comprehensive unit tests for core functionality.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:paper       # Paper trading tests only
npm run test:analyzer    # Token analyzer tests only
```

## Test Coverage

### Paper Trading Tests (`tests/paper-trading.test.js`)

Tests the virtual portfolio system:

✅ **12 Tests**
- Initialize with default values
- Toggle enable/disable
- Execute buy trade
- Buy more of same token (cost averaging)
- Sell partial position
- Sell all position
- Track stats correctly (trades, wins, losses, returns)
- Insufficient balance error handling
- Sell non-existent token error handling
- Reset account
- Persistence (save and load from disk)
- Trade history

### Token Analyzer Tests (`tests/token-analyzer.test.js`)

Tests the token analysis and scoring system:

✅ **11 Tests**
- Initialize analyzer
- Market cap range check ($30K-$300K)
- Volume trend analysis (5min vs 1H vs 24H)
- Volume trend - medium momentum
- Volume trend - low momentum
- Scoring system - perfect score (100/100)
- Scoring system - poor score (0/100)
- Scoring system - medium score (50-69/100)
- Handle null metadata gracefully
- Handle failed analysis
- Edge cases at exact thresholds

## Test Structure

### Test Files

```
tests/
├── run-tests.js              # Test runner
├── paper-trading.test.js     # Paper trading unit tests
└── token-analyzer.test.js    # Token analysis unit tests
```

### Test Runner

The test runner (`run-tests.js`) executes all test files and provides a summary:

- Runs tests sequentially
- Reports pass/fail for each file
- Shows total summary at end
- Exits with code 1 if any tests fail (CI-friendly)

## Writing New Tests

### Basic Test Structure

```javascript
import { strict as assert } from 'assert';

console.log('Test 1: Description');
try {
  // Your test code
  const result = someFunction();
  assert.equal(result, expectedValue, 'Error message');
  console.log('✅ Passed\n');
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}
```

### Best Practices

1. **Clear descriptions**: Each test should have a descriptive name
2. **Isolated tests**: Tests should not depend on each other
3. **Clean up**: Use cleanup functions to remove test files/state
4. **Good assertions**: Use descriptive error messages
5. **Edge cases**: Test boundary conditions and error cases

### Example Test

```javascript
// Test: Execute paper trade
console.log('Test 3: Execute buy trade');
pt.toggle(); // Enable
const buyResult = await pt.buy('TESTMINT123', 'TEST', 0.1, 0.001);
assert.equal(buyResult.success, true, 'Buy should succeed');
assert.equal(buyResult.trade.amountSOL, 0.1, 'Should spend 0.1 SOL');
assert.equal(buyResult.trade.tokensReceived, 100, 'Should receive 100 tokens at $0.001');
console.log('✅ Passed\n');
```

## CI/CD Integration

Tests are designed to work in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

The test suite:
- Exits with code 0 on success
- Exits with code 1 on failure
- Provides clear pass/fail output
- Runs in ~2 seconds

## Network Tests

Some functionality requires network access and is NOT included in the test suite:

### Not Tested (Requires Live RPC)
- `TokenAnalyzer.getTokenMetadata()` - Fetches from DexScreener API
- `TokenAnalyzer.findOtherWhalesHolding()` - Queries Solana RPC
- `WalletTracker.getRecentTransactions()` - Queries Solana RPC
- Jupiter swap execution
- Real wallet operations

### Why Not Tested?
- Requires API keys
- Network latency/reliability issues
- Rate limits
- Cost (RPC requests)
- External service dependencies

### Testing Network Code

For integration testing with network calls:

1. Use a local Solana test validator
2. Mock API responses
3. Create separate integration test suite
4. Run manually or in dedicated CI environment

Example mock:

```javascript
// Mock DexScreener API
const mockFetch = async (url) => {
  if (url.includes('dexscreener')) {
    return {
      json: async () => ({
        pairs: [{
          priceUsd: '0.001',
          volume: { m5: 1000, h1: 3000, h24: 12000 },
          fdv: 100000,
          liquidity: { usd: 50000 }
        }]
      })
    };
  }
};
global.fetch = mockFetch;
```

## Troubleshooting

### Tests Fail with "Module not found"

Make sure you've installed dependencies:
```bash
npm install
```

### Floating Point Precision Errors

When comparing floating point numbers:

```javascript
// ❌ Bad: Will fail due to floating point precision
assert.equal(stats.totalReturn, 0.3);

// ✅ Good: Use toFixed() for comparison
assert.equal(stats.totalReturn.toFixed(2), '0.30');

// ✅ Good: Use rounding
assert.equal(Math.round(stats.returnPercent), 30);
```

### Test Files Not Found

The test runner looks for `*.test.js` files in the `tests/` directory.
Make sure your test files follow this naming convention.

### Permission Errors on Test Files

The test data files need write permissions:
```bash
chmod 644 tests/*.json
```

## Performance

Current test performance:

- **Paper Trading**: ~500ms (includes file I/O)
- **Token Analyzer**: ~50ms (pure logic, no network)
- **Total Suite**: ~2 seconds

## Future Test Coverage

Planned additions:

- [ ] Integration tests with local Solana validator
- [ ] Telegram bot command tests
- [ ] Trade thesis agent tests
- [ ] Jupiter trader mocked API tests
- [ ] Wallet manager tests
- [ ] End-to-end workflow tests
- [ ] Performance benchmarks
- [ ] Load testing for monitor

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add tests for edge cases
4. Update this documentation
5. Run `npm test` before committing

## Test Philosophy

**Testing Strategy:**
- Unit tests for core business logic
- Integration tests for external services (separate suite)
- Manual testing for UI/UX (Telegram bot)
- End-to-end tests for critical workflows

**We prioritize:**
- Fast execution (no network calls in unit tests)
- Clear failure messages
- Isolated tests (no shared state)
- Readable test code
- High coverage of edge cases

**We don't test:**
- Third-party libraries
- External APIs (we assume they work)
- Simple getters/setters
- Trivial code paths
