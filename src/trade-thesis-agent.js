import Anthropic from '@anthropic-ai/sdk';

/**
 * TradeThesisAgent - AI-powered trade thesis generation
 *
 * Uses Claude to analyze token data and generate buy/sell recommendations
 */
export class TradeThesisAgent {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!this.apiKey) {
      console.warn('⚠️  Anthropic API key not found. Thesis generation will be disabled.');
      this.enabled = false;
    } else {
      this.anthropic = new Anthropic({ apiKey: this.apiKey });
      this.enabled = true;
      console.log('✅ Trade Thesis Agent initialized');
    }
  }

  /**
   * Generate trade thesis using AI
   */
  async generateThesis(tokenAnalysis, walletInfo, transactionDetails) {
    if (!this.enabled) {
      return this.generateFallbackThesis(tokenAnalysis);
    }

    try {
      const prompt = this.buildPrompt(tokenAnalysis, walletInfo, transactionDetails);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const thesis = response.content[0].text;

      // Extract recommendation from thesis
      const recommendation = this.extractRecommendation(thesis);

      return {
        thesis,
        recommendation,
        score: tokenAnalysis.score || 50,
        aiGenerated: true
      };
    } catch (error) {
      console.error('Error generating AI thesis:', error.message);
      return this.generateFallbackThesis(tokenAnalysis);
    }
  }

  /**
   * Build prompt for Claude
   */
  buildPrompt(analysis, wallet, transaction) {
    const { token, marketData, volumeAnalysis, whaleActivity, tokenAge, priceAction } = analysis;

    return `You are an expert Solana degen trader analyzing a token purchase. Generate a concise trade thesis.

## Token Purchase Alert
**Wallet:** ${wallet.emoji} ${wallet.name}
**Token:** ${token.symbol} (${token.name})
**Transaction:** Buy detected

## Market Data
- **Market Cap:** ${marketData.marketCapFormatted} ${marketData.inTargetRange ? '✅ IN TARGET RANGE ($30K-$300K)' : '❌ OUTSIDE TARGET'}
- **Price:** $${marketData.price}
- **Liquidity:** ${marketData.liquidityFormatted}

## Volume Analysis (Last 5 min vs Historical)
- **5min Volume:** $${volumeAnalysis?.volume5m?.toFixed(0) || 'N/A'}
- **vs 1H avg:** ${volumeAnalysis?.recentVsHourMultiplier?.toFixed(2)}x ${volumeAnalysis?.momentum === 'high' ? '🔥' : volumeAnalysis?.momentum === 'medium' ? '📊' : '📉'}
- **vs 24H avg:** ${volumeAnalysis?.recentVsDayMultiplier?.toFixed(2)}x
- **Status:** ${volumeAnalysis?.isHeatingUp ? '🔥 HEATING UP' : 'Normal activity'}

## Price Action
- **5min:** ${priceAction.change5m > 0 ? '+' : ''}${priceAction.change5m.toFixed(1)}%
- **1H:** ${priceAction.change1h > 0 ? '+' : ''}${priceAction.change1h.toFixed(1)}%
- **24H:** ${priceAction.change24h > 0 ? '+' : ''}${priceAction.change24h.toFixed(1)}%

## Whale Activity
${whaleActivity.whaleCount > 0 ? `**${whaleActivity.whaleCount} other tracked whale(s) holding this token:**
${whaleActivity.otherWhalesHolding.map(w => `- ${w.emoji} ${w.name} (${w.balance.toFixed(2)} tokens)`).join('\n')}` : 'No other tracked whales detected'}

## Token Age
- **Created:** ${tokenAge.hours ? `${tokenAge.hours.toFixed(1)} hours ago` : 'Unknown'} ${tokenAge.isNew ? '🆕 NEW' : ''}

Generate a thesis in this EXACT format:

**RECOMMENDATION:** [BUY/WATCH/SKIP]

**THESIS:**
[2-3 sentences explaining why this is or isn't a good trade based on the data]

**KEY FACTORS:**
✅ [Positive factor 1]
✅ [Positive factor 2]
⚠️ [Risk factor 1]
⚠️ [Risk factor 2]

**EXIT PLAN:**
[When to take profit and when to cut losses]

Keep it concise and actionable. Focus on the market cap range, volume momentum, and whale activity.`;
  }

  /**
   * Extract recommendation from thesis text
   */
  extractRecommendation(thesis) {
    if (thesis.includes('RECOMMENDATION:** BUY') || thesis.includes('RECOMMENDATION: BUY')) {
      return 'BUY';
    } else if (thesis.includes('RECOMMENDATION:** WATCH') || thesis.includes('RECOMMENDATION: WATCH')) {
      return 'WATCH';
    } else {
      return 'SKIP';
    }
  }

  /**
   * Generate fallback thesis without AI (if API key not available)
   */
  generateFallbackThesis(analysis) {
    const scoring = analysis.scoring || { score: 50, signals: [], recommendation: 'WATCH' };

    const thesis = `**RECOMMENDATION:** ${scoring.recommendation}

**QUICK ANALYSIS:**
${scoring.signals.join('\n')}

**SCORE:** ${scoring.score}/100

**Market Cap:** ${analysis.marketData?.marketCapFormatted || 'Unknown'}
**Volume Momentum:** ${analysis.volumeAnalysis?.momentum || 'Unknown'}
**Other Whales:** ${analysis.whaleActivity?.whaleCount || 0} holding

_AI thesis generation disabled (no API key)_`;

    return {
      thesis,
      recommendation: scoring.recommendation,
      score: scoring.score,
      aiGenerated: false
    };
  }

  /**
   * Format thesis for Telegram (with markdown escaping)
   */
  formatForTelegram(thesisResult) {
    // Escape markdown special characters except for those we want to keep
    const thesis = thesisResult.thesis
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    const emoji = thesisResult.recommendation === 'BUY' ? '🟢' :
                  thesisResult.recommendation === 'WATCH' ? '🟡' : '🔴';

    return `
${emoji} **TRADE THESIS** ${emoji}

${thesis}

${thesisResult.aiGenerated ? '🤖 _AI Generated_' : '📊 _Rule Based_'}
    `.trim();
  }
}

export default TradeThesisAgent;
