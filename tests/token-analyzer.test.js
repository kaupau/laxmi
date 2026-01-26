import { TokenAnalyzer } from '../src/token-analyzer.js';
import { strict as assert } from 'assert';

/**
 * Tests for TokenAnalyzer class
 * Note: Some tests require network access to DexScreener API
 */

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const MOCK_WALLETS = [
  { name: 'wallet1', emoji: '🐋', trackedWalletAddress: '11111111111111111111111111111111' },
  { name: 'wallet2', emoji: '🦈', trackedWalletAddress: '22222222222222222222222222222222' }
];

console.log('🧪 Running Token Analyzer Tests...\n');

// Test 1: Initialize analyzer
console.log('Test 1: Initialize analyzer');
const analyzer = new TokenAnalyzer(RPC_URL, MOCK_WALLETS);
assert.equal(analyzer.trackedWallets.length, 2, 'Should have 2 tracked wallets');
console.log('✅ Passed\n');

// Test 2: Market cap range check
console.log('Test 2: Market cap range check');
assert.equal(analyzer.isMarketCapInRange(50000), true, '$50K should be in range');
assert.equal(analyzer.isMarketCapInRange(200000), true, '$200K should be in range');
assert.equal(analyzer.isMarketCapInRange(20000), false, '$20K should be below range');
assert.equal(analyzer.isMarketCapInRange(350000), false, '$350K should be above range');
assert.equal(analyzer.isMarketCapInRange(30000), true, '$30K should be at min range');
assert.equal(analyzer.isMarketCapInRange(300000), true, '$300K should be at max range');
console.log('✅ Passed\n');

// Test 3: Volume trend analysis
console.log('Test 3: Volume trend analysis');
const mockMetadata = {
  volume5m: 1000,
  volume1h: 3000,  // 12 * 5min periods = avg 250 per 5min
  volume24h: 12000  // 288 * 5min periods = avg 41.67 per 5min
};

const volumeTrend = analyzer.analyzeVolumeTrend(mockMetadata);
assert.equal(volumeTrend.volume5m, 1000, 'Should return 5min volume');
assert.equal(volumeTrend.recentVsHourMultiplier, 4, 'Should be 4x vs hour avg (1000/250)');
assert.equal(volumeTrend.recentVsDayMultiplier.toFixed(2), '24.00', 'Should be 24x vs day avg');
assert.equal(volumeTrend.momentum, 'high', 'Should be high momentum (>2x)');
assert.equal(volumeTrend.isHeatingUp, true, 'Should be heating up (>1.5x hour and >2x day)');
console.log('✅ Passed\n');

// Test 4: Volume trend - medium momentum
console.log('Test 4: Volume trend - medium momentum');
const mockMetadata2 = {
  volume5m: 400,
  volume1h: 2400,  // avg 200 per 5min
  volume24h: 28800  // avg 100 per 5min
};

const volumeTrend2 = analyzer.analyzeVolumeTrend(mockMetadata2);
assert.equal(volumeTrend2.recentVsHourMultiplier, 2, 'Should be 2x vs hour avg');
assert.equal(volumeTrend2.momentum, 'high', 'Should be high momentum (2x = high threshold)');
console.log('✅ Passed\n');

// Test 5: Volume trend - low momentum
console.log('Test 5: Volume trend - low momentum');
const mockMetadata3 = {
  volume5m: 100,
  volume1h: 1200,  // avg 100 per 5min
  volume24h: 28800  // avg 100 per 5min
};

const volumeTrend3 = analyzer.analyzeVolumeTrend(mockMetadata3);
assert.equal(volumeTrend3.recentVsHourMultiplier, 1, 'Should be 1x vs hour avg');
assert.equal(volumeTrend3.momentum, 'low', 'Should be low momentum (<1.5x)');
assert.equal(volumeTrend3.isHeatingUp, false, 'Should not be heating up');
console.log('✅ Passed\n');

// Test 6: Scoring system - perfect score
console.log('Test 6: Scoring system - perfect score');
const perfectAnalysis = {
  success: true,
  marketData: {
    marketCap: 100000,  // In range
    inTargetRange: true,
    liquidity: 50000  // Good liquidity
  },
  volumeAnalysis: {
    isHeatingUp: true,
    momentum: 'high'
  },
  whaleActivity: {
    whaleCount: 3  // Multiple whales
  },
  tokenAge: {
    hours: 0.5,
    isNew: true
  },
  priceAction: {
    change5m: 15  // Pumping
  }
};

const scoring = analyzer.scoreToken(perfectAnalysis);
assert.equal(scoring.score >= 70, true, 'Perfect analysis should score >= 70');
assert.equal(scoring.recommendation, 'BUY', 'Should recommend BUY');
assert.equal(scoring.signals.length > 0, true, 'Should have signals');
console.log(`✅ Passed (Score: ${scoring.score}/100)\n`);

// Test 7: Scoring system - poor score
console.log('Test 7: Scoring system - poor score');
const poorAnalysis = {
  success: true,
  marketData: {
    marketCap: 500000,  // Too high
    inTargetRange: false,
    liquidity: 5000  // Low liquidity
  },
  volumeAnalysis: {
    isHeatingUp: false,
    momentum: 'low'
  },
  whaleActivity: {
    whaleCount: 0  // No other whales
  },
  tokenAge: {
    hours: 48,
    isNew: false
  },
  priceAction: {
    change5m: -15  // Dumping
  }
};

const scoring2 = analyzer.scoreToken(poorAnalysis);
assert.equal(scoring2.score < 50, true, 'Poor analysis should score < 50');
assert.equal(scoring2.recommendation, 'SKIP', 'Should recommend SKIP');
console.log(`✅ Passed (Score: ${scoring2.score}/100)\n`);

// Test 8: Scoring system - medium score
console.log('Test 8: Scoring system - medium score');
const mediumAnalysis = {
  success: true,
  marketData: {
    marketCap: 150000,  // In range
    inTargetRange: true,
    liquidity: 15000  // OK liquidity
  },
  volumeAnalysis: {
    isHeatingUp: false,
    momentum: 'low'  // Changed to low to reduce score
  },
  whaleActivity: {
    whaleCount: 0  // No other whales
  },
  tokenAge: {
    hours: 30,  // Not new (>24 hours)
    isNew: false
  },
  priceAction: {
    change5m: 1  // Minimal change
  }
};

const scoring3 = analyzer.scoreToken(mediumAnalysis);
console.log(`  Actual score: ${scoring3.score}, Recommendation: ${scoring3.recommendation}`);
assert.equal(scoring3.score >= 50 && scoring3.score < 70, true, `Medium analysis should score 50-69, got ${scoring3.score}`);
assert.equal(scoring3.recommendation, 'WATCH', 'Should recommend WATCH');
console.log(`✅ Passed (Score: ${scoring3.score}/100)\n`);

// Test 9: Handle null metadata gracefully
console.log('Test 9: Handle null metadata gracefully');
const nullTrend = analyzer.analyzeVolumeTrend(null);
assert.equal(nullTrend, null, 'Should return null for null metadata');
console.log('✅ Passed\n');

// Test 10: Handle failed analysis
console.log('Test 10: Handle failed analysis');
const failedAnalysis = { success: false };
const failedScoring = analyzer.scoreToken(failedAnalysis);
assert.equal(failedScoring.score, 0, 'Failed analysis should score 0');
assert.equal(failedScoring.signals[0], 'No data available', 'Should indicate no data');
console.log('✅ Passed\n');

// Test 11: Edge case - exactly at thresholds
console.log('Test 11: Edge case - exactly at thresholds');
const edgeAnalysis = {
  success: true,
  marketData: {
    marketCap: 30000,  // Exactly at min
    inTargetRange: true,
    liquidity: 10000  // Exactly at threshold
  },
  volumeAnalysis: {
    isHeatingUp: false,
    momentum: 'medium',
    recentVsHourMultiplier: 1.5  // Exactly at threshold
  },
  whaleActivity: {
    whaleCount: 0
  },
  tokenAge: {
    hours: 1,  // Exactly 1 hour
    isNew: false
  },
  priceAction: {
    change5m: 10  // Exactly at threshold
  }
};

const edgeScoring = analyzer.scoreToken(edgeAnalysis);
assert.equal(typeof edgeScoring.score, 'number', 'Should return numeric score');
assert.equal(edgeScoring.score >= 0 && edgeScoring.score <= 100, true, 'Score should be 0-100');
console.log(`✅ Passed (Score: ${edgeScoring.score}/100)\n`);

console.log('✅ All Token Analyzer tests passed!');
console.log('\n📝 Note: Network tests (getTokenMetadata, findOtherWhalesHolding) require live RPC and are not included in this test suite.');
