/**
 * Pigeon API Integration Demo
 *
 * This demonstrates the enhanced features available when integrating
 * with Pigeon.trade API.
 *
 * To use this:
 * 1. Get a Pigeon API key from https://pigeon.trade
 * 2. Set PIGEON_API_KEY environment variable
 * 3. Run: node examples/pigeon-demo.js
 */

import { EnhancedWalletTracker } from '../src/enhanced-tracker.js';
import { config } from 'dotenv';

// Load environment variables (if using dotenv)
// config();

const PIGEON_API_KEY = process.env.PIGEON_API_KEY;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

async function main() {
  console.log('🚀 Pigeon API Integration Demo\n');

  // Check if Pigeon API key is configured
  if (!PIGEON_API_KEY) {
    console.log('⚠️  PIGEON_API_KEY not set - running in demo mode');
    console.log('To enable Pigeon features:');
    console.log('1. Get API key from https://pigeon.trade');
    console.log('2. export PIGEON_API_KEY=your_key_here');
    console.log('3. Run this script again\n');

    console.log('📚 See PIGEON_INTEGRATION.md for full integration guide');
    return;
  }

  // Initialize enhanced tracker
  const tracker = new EnhancedWalletTracker(RPC_URL, PIGEON_API_KEY, {
    pigeonOptions: {
      dailyBudget: 1.00, // $1/day budget
      cacheTimeout: 300000 // 5 minute cache
    }
  });

  tracker.loadWallets();

  console.log('📊 Enhanced Wallet Tracker Initialized\n');

  // =======================================================
  // DEMO 1: Enhanced Portfolio View
  // =======================================================
  console.log('='.repeat(60));
  console.log('DEMO 1: Enhanced Portfolio Tracking');
  console.log('='.repeat(60));
  console.log('Getting full token portfolio (not just SOL)...\n');

  try {
    // Pick first wallet for demo
    const demoWallet = tracker.wallets[0];
    console.log(`Analyzing: ${demoWallet.emoji} ${demoWallet.name}\n`);

    const portfolio = await tracker.getTokenPortfolio(demoWallet.name);

    console.log(`SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL`);
    console.log(`Total Tokens: ${portfolio.tokens.length}`);
    console.log(`Total USD Value: $${portfolio.totalUsdValue.toFixed(2)}\n`);

    if (portfolio.tokens.length > 0) {
      console.log('Top Holdings:');
      portfolio.tokens
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, 5)
        .forEach((token, i) => {
          console.log(`${i + 1}. ${token.symbol}: ${token.amount.toFixed(2)} ($${token.usdValue.toFixed(2)})`);
        });
    }

    console.log('\n✨ LLM-Friendly Summary:');
    console.log('-'.repeat(60));
    const summary = await tracker.getPortfolioSummary(demoWallet.name);
    console.log(summary);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');

  // =======================================================
  // DEMO 2: PnL Analysis
  // =======================================================
  console.log('='.repeat(60));
  console.log('DEMO 2: Profit & Loss Analysis');
  console.log('='.repeat(60));
  console.log('Calculating realized PnL across all tokens...\n');

  try {
    const demoWallet = tracker.wallets[0];

    const pnl = await tracker.getCompletePnL(demoWallet.name);

    console.log(`Wallet: ${pnl.wallet}`);
    console.log(`Total Realized PnL: ${pnl.totalRealizedPnL > 0 ? '✅' : '❌'} ${pnl.totalRealizedPnL.toFixed(4)} SOL`);
    console.log(`Win Rate: ${pnl.winRate.toFixed(1)}% (${pnl.winningTrades}W / ${pnl.losingTrades}L)`);

    console.log('\n✨ LLM-Friendly Summary:');
    console.log('-'.repeat(60));
    const pnlSummary = await tracker.getPnLSummary(demoWallet.name);
    console.log(pnlSummary);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');

  // =======================================================
  // DEMO 3: Market Intelligence
  // =======================================================
  console.log('='.repeat(60));
  console.log('DEMO 3: Market Intelligence');
  console.log('='.repeat(60));
  console.log('Discovering trending Solana tokens...\n');

  try {
    const trending = await tracker.discoverTrendingTokens('solana', 10);

    console.log('🔥 Top Trending Tokens:\n');
    trending.forEach((token, i) => {
      const emoji = token.priceChange24h > 0 ? '📈' : '📉';
      console.log(`${i + 1}. ${token.symbol} (${token.name})`);
      console.log(`   ${emoji} 24h: ${token.priceChange24h.toFixed(1)}%`);
      console.log(`   Volume: $${(token.volume24h / 1000000).toFixed(2)}M`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // =======================================================
  // DEMO 4: Whale Detection
  // =======================================================
  console.log('='.repeat(60));
  console.log('DEMO 4: Whale Detection');
  console.log('='.repeat(60));
  console.log('Checking if our tracked wallets bought trending tokens...\n');

  try {
    const demoWallet = tracker.wallets[0];

    const trendingBuys = await tracker.detectTrendingPurchases(demoWallet.name);

    console.log(`${demoWallet.emoji} ${demoWallet.name}:`);
    console.log(trendingBuys.summary);

    if (trendingBuys.count > 0) {
      console.log('\n🚨 Trending Token Purchases:');
      trendingBuys.trendingPurchases.forEach(purchase => {
        console.log(`  - ${purchase.token.symbol}: $${purchase.usdValue.toFixed(2)}`);
        console.log(`    Time: ${new Date(purchase.timestamp).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');

  // =======================================================
  // DEMO 5: Spending Stats
  // =======================================================
  console.log('='.repeat(60));
  console.log('DEMO 5: Pigeon API Budget Management');
  console.log('='.repeat(60));

  const stats = tracker.getPigeonStats();
  console.log(`Daily Budget: $${stats.budget.toFixed(2)}`);
  console.log(`Spent Today: $${stats.spentToday.toFixed(2)}`);
  console.log(`Remaining: $${stats.remaining.toFixed(2)}`);
  console.log(`Usage: ${stats.percentUsed.toFixed(1)}%`);
  console.log(`Cache Size: ${stats.cacheSize} entries`);

  console.log('\n');

  // =======================================================
  // AI AGENT EXAMPLE
  // =======================================================
  console.log('='.repeat(60));
  console.log('AI AGENT EXAMPLE: Portfolio Analysis');
  console.log('='.repeat(60));
  console.log('This is how an AI agent would use the enhanced data:\n');

  try {
    const demoWallet = tracker.wallets[0];

    // Gather comprehensive data
    const portfolio = await tracker.getTokenPortfolio(demoWallet.name);
    const pnl = await tracker.getCompletePnL(demoWallet.name);
    const trending = await tracker.discoverTrendingTokens('solana', 5);

    // Build context for LLM
    const llmContext = `
WALLET ANALYSIS REQUEST

Wallet: ${demoWallet.emoji} ${demoWallet.name}
Address: ${demoWallet.trackedWalletAddress}

PORTFOLIO:
- SOL: ${portfolio.solBalance.toFixed(4)} SOL
- Total Tokens: ${portfolio.tokens.length}
- Total USD Value: $${portfolio.totalUsdValue.toFixed(2)}

Top Holdings:
${portfolio.tokens
  .sort((a, b) => b.usdValue - a.usdValue)
  .slice(0, 5)
  .map(t => `- ${t.symbol}: $${t.usdValue.toFixed(2)}`)
  .join('\n')}

PERFORMANCE:
- Realized PnL: ${pnl.totalRealizedPnL > 0 ? '✅' : '❌'} ${pnl.totalRealizedPnL.toFixed(4)} SOL
- Win Rate: ${pnl.winRate.toFixed(1)}%
- Winning Trades: ${pnl.winningTrades}
- Losing Trades: ${pnl.losingTrades}

MARKET CONTEXT:
Trending Tokens Right Now:
${trending.slice(0, 3).map(t => `- ${t.symbol}: ${t.priceChange24h > 0 ? '📈' : '📉'} ${t.priceChange24h.toFixed(1)}%`).join('\n')}

QUESTIONS FOR AI AGENT:
1. Is this wallet's performance good compared to market trends?
2. Are they holding any of the currently trending tokens?
3. Should we copy their trades?
4. What's the biggest risk in this portfolio?
5. Any recommended actions?
    `.trim();

    console.log(llmContext);
    console.log('\n');
    console.log('👆 This context would be sent to Claude/GPT for analysis');
    console.log('The AI would provide actionable insights and recommendations');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('Demo Complete! 🎉');
  console.log('='.repeat(60));
  console.log('\nNext Steps:');
  console.log('1. Review PIGEON_INTEGRATION.md for full documentation');
  console.log('2. Check CLAUDE.md for AI agent integration patterns');
  console.log('3. Explore examples/ai-agent.js for autonomous agents');
  console.log('4. Build your own trading strategies!');
}

// Run the demo
main().catch(console.error);
