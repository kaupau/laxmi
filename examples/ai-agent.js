/**
 * AI Agent Example with Pigeon Integration
 *
 * This demonstrates how to build an autonomous AI agent that:
 * 1. Monitors wallet portfolios
 * 2. Analyzes performance and trends
 * 3. Makes trading recommendations
 * 4. Can execute trades (with human approval)
 *
 * Requires:
 * - PIGEON_API_KEY
 * - ANTHROPIC_API_KEY (for Claude)
 */

import Anthropic from '@anthropic-ai/sdk';
import { EnhancedWalletTracker } from '../src/enhanced-tracker.js';

const PIGEON_API_KEY = process.env.PIGEON_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

class SolanaIntelligenceAgent {
  constructor(pigeonApiKey, anthropicApiKey) {
    this.tracker = new EnhancedWalletTracker(RPC_URL, pigeonApiKey, {
      pigeonOptions: {
        dailyBudget: 5.00 // Higher budget for active agent
      }
    });

    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.conversationHistory = [];
  }

  async initialize() {
    this.tracker.loadWallets();
    console.log(`🤖 AI Agent initialized with ${this.tracker.wallets.length} wallets`);
  }

  /**
   * Ask Claude to analyze wallet data and provide insights
   */
  async analyzeWallet(walletName) {
    console.log(`\n🔍 Analyzing ${walletName}...`);

    // Gather comprehensive data
    const portfolio = await this.tracker.getTokenPortfolio(walletName);
    const pnl = await this.tracker.getCompletePnL(walletName);
    const trending = await this.tracker.discoverTrendingTokens('solana', 10);
    const trendingBuys = await this.tracker.detectTrendingPurchases(walletName);

    // Build context for Claude
    const context = `
Analyze this Solana wallet and provide actionable insights:

WALLET: ${walletName}
Address: ${portfolio.address}

CURRENT PORTFOLIO:
- SOL Balance: ${portfolio.solBalance.toFixed(4)} SOL
- Token Count: ${portfolio.tokens.length}
- Total USD Value: $${portfolio.totalUsdValue.toFixed(2)}

Top 10 Holdings:
${portfolio.tokens
  .sort((a, b) => b.usdValue - a.usdValue)
  .slice(0, 10)
  .map((t, i) => `${i + 1}. ${t.symbol}: ${t.amount.toFixed(2)} ($${t.usdValue.toFixed(2)}) - 24h: ${t.priceChange24h?.toFixed(1) || 'N/A'}%`)
  .join('\n')}

HISTORICAL PERFORMANCE:
- Total Realized PnL: ${pnl.totalRealizedPnL.toFixed(4)} SOL (${pnl.totalRealizedPnL > 0 ? 'Profitable' : 'Losing'})
- Win Rate: ${pnl.winRate.toFixed(1)}%
- Winning Trades: ${pnl.winningTrades}
- Losing Trades: ${pnl.losingTrades}

Top 5 Profitable Tokens:
${pnl.tokens
  .filter(t => t.profitable)
  .sort((a, b) => b.realizedPnL - a.realizedPnL)
  .slice(0, 5)
  .map(t => `- ${t.token}: +${t.realizedPnL.toFixed(4)} SOL (${t.trades} trades)`)
  .join('\n') || 'None'}

Top 5 Losing Tokens:
${pnl.tokens
  .filter(t => !t.profitable)
  .sort((a, b) => a.realizedPnL - b.realizedPnL)
  .slice(0, 5)
  .map(t => `- ${t.token}: ${t.realizedPnL.toFixed(4)} SOL (${t.trades} trades)`)
  .join('\n') || 'None'}

MARKET CONTEXT:
Currently Trending Tokens on Solana:
${trending
  .slice(0, 5)
  .map(t => `- ${t.symbol} (${t.name}): ${t.priceChange24h > 0 ? '📈' : '📉'} ${t.priceChange24h.toFixed(1)}%`)
  .join('\n')}

RECENT ACTIVITY:
${trendingBuys.summary}
${trendingBuys.count > 0 ?
  `Recent trending token purchases:\n${trendingBuys.trendingPurchases
    .slice(0, 3)
    .map(p => `- ${p.token.symbol}: $${p.usdValue.toFixed(2)} at ${new Date(p.timestamp).toLocaleString()}`)
    .join('\n')}` :
  'No recent trending token purchases'}

Please provide:
1. Overall assessment of this wallet's strategy and performance
2. Risk analysis (is this wallet concentrated in risky tokens?)
3. Actionable recommendations (what should we do based on this data?)
4. Should we consider copying this wallet's trades? Why or why not?
5. Any red flags or warning signs?

Be specific and actionable.
    `.trim();

    // Ask Claude for analysis
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: context
      }]
    });

    const analysis = message.content[0].text;
    console.log('\n🧠 AI Analysis:\n');
    console.log(analysis);

    return analysis;
  }

  /**
   * Compare multiple wallets and identify the best performer
   */
  async compareWallets() {
    console.log('\n📊 Comparing all tracked wallets...');

    const walletData = [];

    for (const wallet of this.tracker.wallets) {
      try {
        const portfolio = await this.tracker.getTokenPortfolio(wallet.name);
        const pnl = await this.tracker.getCompletePnL(wallet.name);

        walletData.push({
          name: wallet.name,
          emoji: wallet.emoji,
          totalValue: portfolio.totalUsdValue,
          pnl: pnl.totalRealizedPnL,
          winRate: pnl.winRate,
          tokenCount: portfolio.tokens.length
        });
      } catch (error) {
        console.error(`Error analyzing ${wallet.name}:`, error.message);
      }
    }

    // Build comparison context
    const context = `
Compare these ${walletData.length} Solana wallets and identify:
1. Which wallet has the best overall performance?
2. Which wallet is the best to copy trade?
3. Which wallet is the riskiest?
4. Any patterns or insights across the wallets?

WALLET DATA:
${walletData
  .map(w => `
${w.emoji} ${w.name}:
  - Total Portfolio Value: $${w.totalValue.toFixed(2)}
  - Realized PnL: ${w.pnl > 0 ? '+' : ''}${w.pnl.toFixed(4)} SOL
  - Win Rate: ${w.winRate.toFixed(1)}%
  - Token Diversity: ${w.tokenCount} tokens
  `)
  .join('\n')}

Provide a clear ranking and recommendation for which wallet(s) we should focus on monitoring or copying.
    `.trim();

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1536,
      messages: [{
        role: 'user',
        content: context
      }]
    });

    const comparison = message.content[0].text;
    console.log('\n🧠 AI Comparison:\n');
    console.log(comparison);

    return comparison;
  }

  /**
   * Autonomous monitoring loop
   */
  async startMonitoring(intervalMinutes = 30) {
    console.log(`\n🔄 Starting autonomous monitoring (every ${intervalMinutes} minutes)...\n`);

    const monitor = async () => {
      console.log(`\n⏰ ${new Date().toLocaleString()} - Running periodic analysis...`);

      try {
        // Get trending tokens
        const trending = await this.tracker.discoverTrendingTokens('solana', 10);

        // Check each wallet for interesting activity
        for (const wallet of this.tracker.wallets) {
          const trendingBuys = await this.tracker.detectTrendingPurchases(wallet.name);

          if (trendingBuys.count > 0) {
            console.log(`\n🚨 ALERT: ${wallet.emoji} ${wallet.name} bought trending tokens!`);

            // Get AI analysis of this specific activity
            const context = `
ALERT: Wallet ${wallet.name} just bought trending tokens!

Purchases:
${trendingBuys.trendingPurchases
  .map(p => `- ${p.token.symbol}: $${p.usdValue.toFixed(2)} at ${new Date(p.timestamp).toLocaleString()}`)
  .join('\n')}

Currently trending tokens:
${trending.slice(0, 5).map(t => `- ${t.symbol}: ${t.priceChange24h.toFixed(1)}%`).join('\n')}

Should I:
1. Alert the user immediately?
2. Copy this trade?
3. Investigate further?
4. Do nothing?

Provide a specific recommendation with reasoning.
            `.trim();

            const message = await this.anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 512,
              messages: [{ role: 'user', content: context }]
            });

            console.log('\n🤖 AI Recommendation:');
            console.log(message.content[0].text);
          }
        }

        console.log('\n✅ Monitoring cycle complete');

      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    };

    // Run immediately
    await monitor();

    // Then run on interval
    setInterval(monitor, intervalMinutes * 60 * 1000);
  }

  /**
   * Interactive chat interface
   */
  async chat(userMessage) {
    console.log(`\n👤 User: ${userMessage}`);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Determine what data to gather based on the question
    let contextData = '';

    if (userMessage.toLowerCase().includes('portfolio') ||
        userMessage.toLowerCase().includes('balance') ||
        userMessage.toLowerCase().includes('holding')) {
      // Gather portfolio data
      const summaries = [];
      for (const wallet of this.tracker.wallets) {
        const summary = await this.tracker.getPortfolioSummary(wallet.name);
        summaries.push(summary);
      }
      contextData = `\nCurrent Portfolio Data:\n${summaries.join('\n\n')}`;
    }

    if (userMessage.toLowerCase().includes('trending') ||
        userMessage.toLowerCase().includes('hot') ||
        userMessage.toLowerCase().includes('market')) {
      // Gather trending data
      const trending = await this.tracker.discoverTrendingTokens('solana', 10);
      contextData += `\n\nTrending Tokens:\n${trending
        .map(t => `- ${t.symbol}: ${t.priceChange24h > 0 ? '📈' : '📉'} ${t.priceChange24h.toFixed(1)}%`)
        .join('\n')}`;
    }

    // Build system prompt
    const systemPrompt = `You are an AI assistant specialized in Solana wallet analysis and trading.
You have access to real-time portfolio data, PnL calculations, trending tokens, and market sentiment.

Current wallets being tracked: ${this.tracker.wallets.map(w => `${w.emoji} ${w.name}`).join(', ')}

${contextData}

Provide helpful, actionable insights based on the available data.`;

    // Create message with history
    const messages = [
      ...this.conversationHistory
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Add to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    console.log(`\n🤖 Agent: ${assistantMessage}\n`);

    return assistantMessage;
  }
}

// ============================================================
// MAIN DEMO
// ============================================================

async function main() {
  console.log('🚀 AI Trading Agent Demo\n');

  if (!PIGEON_API_KEY) {
    console.error('❌ PIGEON_API_KEY not set');
    console.log('Get your API key from https://pigeon.trade');
    return;
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    console.log('Get your API key from https://console.anthropic.com');
    return;
  }

  // Initialize agent
  const agent = new SolanaIntelligenceAgent(PIGEON_API_KEY, ANTHROPIC_API_KEY);
  await agent.initialize();

  // Demo 1: Analyze a single wallet
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 1: Single Wallet Analysis');
  console.log('='.repeat(60));

  const firstWallet = agent.tracker.wallets[0];
  await agent.analyzeWallet(firstWallet.name);

  // Demo 2: Compare all wallets
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 2: Wallet Comparison');
  console.log('='.repeat(60));

  await agent.compareWallets();

  // Demo 3: Interactive chat
  console.log('\n' + '='.repeat(60));
  console.log('DEMO 3: Interactive Chat');
  console.log('='.repeat(60));

  await agent.chat("What's the total value of all portfolios?");
  await agent.chat("Which wallet should I copy trade?");
  await agent.chat("What are the biggest risks right now?");

  // Demo 4: Autonomous monitoring (commented out - runs forever)
  // console.log('\n' + '='.repeat(60));
  // console.log('DEMO 4: Autonomous Monitoring');
  // console.log('='.repeat(60));
  // await agent.startMonitoring(30); // Check every 30 minutes

  console.log('\n✅ Demo complete!');
  console.log('\nTo run autonomous monitoring, uncomment the last section in ai-agent.js');
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SolanaIntelligenceAgent };
