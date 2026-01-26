#!/usr/bin/env node

/**
 * Laxmi Wallet Tracker - Telegram Alert Bot
 *
 * Real-time wallet monitoring with Telegram notifications.
 * Sends alerts when tracked wallets have activity.
 */

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { WalletTracker } from './src/tracker.js';
import { WalletMonitor, AlertType } from './src/alerts.js';
import { WalletManager } from './src/wallet.js';
import { JupiterTrader } from './src/jupiter-trader.js';
import { TokenAnalyzer } from './src/token-analyzer.js';
import { TradeThesisAgent } from './src/trade-thesis-agent.js';
import { PaperTrading } from './src/paper-trading.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OWNER_ID = process.env.TELEGRAM_OWNER_ID;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not set in .env file');
  console.error('Get your bot token from @BotFather on Telegram');
  process.exit(1);
}

if (!CHAT_ID) {
  console.warn('⚠️  Warning: TELEGRAM_CHAT_ID not set. Alerts will only work with /start');
}

if (!OWNER_ID) {
  console.warn('⚠️  Warning: TELEGRAM_OWNER_ID not set. Bot is accessible to everyone!');
}

// Initialize Telegram bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Initialize OpenAI for code editing
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Initialize wallet tracker and monitor
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const tracker = new WalletTracker(RPC_URL);
tracker.loadWallets();

const monitor = new WalletMonitor(tracker, {
  pollInterval: 60000, // 60 seconds (increased to avoid rate limits)
  largeTransactionThreshold: 10 // 10 SOL
});

// Initialize bot wallet for trading
const botWallet = new WalletManager(RPC_URL);
if (process.env.BOT_WALLET_PRIVATE_KEY) {
  try {
    botWallet.loadWallet(process.env.BOT_WALLET_PRIVATE_KEY);
    console.log('💼 Bot wallet loaded:', botWallet.getPublicKey());
  } catch (error) {
    console.error('❌ Failed to load bot wallet:', error.message);
  }
}

// Initialize Jupiter trader for swaps
const jupiterTrader = new JupiterTrader(botWallet, RPC_URL);

// Initialize token analyzer and AI thesis agent
const tokenAnalyzer = new TokenAnalyzer(RPC_URL, tracker.wallets);
const thesisAgent = new TradeThesisAgent(process.env.ANTHROPIC_API_KEY);

// Initialize paper trading
const paperTrading = new PaperTrading('./paper-trades.json');

// Bot state
let alertChatId = CHAT_ID;
let alertsMuted = false;
const stats = {
  alertsSent: 0,
  commandsReceived: 0,
  startTime: new Date()
};

// ===== SECURITY MIDDLEWARE =====

/**
 * Check if user is authorized to use the bot
 * Includes owner and additional authorized users
 */
function isOwner(userId) {
  if (!OWNER_ID) return true; // No owner set = everyone allowed (not recommended)

  // Authorized user IDs
  const authorizedUsers = [
    OWNER_ID,
    '6771866654'  // Friend's ID
  ];

  return authorizedUsers.includes(userId.toString());
}

/**
 * Security middleware for all messages
 */
bot.on('message', (msg) => {
  if (!isOwner(msg.from.id)) {
    bot.sendMessage(msg.chat.id, '⛔ *Unauthorized Access*\n\nThis bot is private.', {
      parse_mode: 'Markdown'
    });
    console.log(`⛔ Unauthorized access attempt from user ${msg.from.id} (@${msg.from.username})`);
    return;
  }
});

// ===== COMMAND HANDLERS =====

// Log ALL messages received (for debugging)
bot.on('message', (msg) => {
  console.log(`📥 Message received: "${msg.text}" from user ${msg.from.id} (${msg.from.username || msg.from.first_name}) in chat ${msg.chat.id} (${msg.chat.type})`);
});

/**
 * /start - Welcome message and setup
 */
bot.onText(/\/start/, async (msg) => {
  console.log(`📨 /start received from user ID: ${msg.from.id}, chat ID: ${msg.chat.id}, username: ${msg.from.username || msg.from.first_name}`);

  if (!isOwner(msg.from.id)) {
    console.log(`❌ Unauthorized user: ${msg.from.id}`);
    bot.sendMessage(msg.chat.id, '⛔ You are not authorized to use this bot.');
    return;
  }

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  // Always update chat ID for alerts (handles group upgrades)
  const oldChatId = alertChatId;
  alertChatId = chatId.toString();

  if (oldChatId !== alertChatId) {
    console.log(`✅ Alert chat ID updated: ${oldChatId} → ${chatId}`);

    // Update .env file with new chat ID
    try {
      let envContent = readFileSync('.env', 'utf-8');
      if (envContent.includes('TELEGRAM_CHAT_ID=')) {
        envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/g, `TELEGRAM_CHAT_ID=${chatId}`);
      } else {
        envContent += `\nTELEGRAM_CHAT_ID=${chatId}\n`;
      }
      writeFileSync('.env', envContent);
      console.log(`✅ Updated .env with new chat ID: ${chatId}`);
    } catch (error) {
      console.error('⚠️  Could not update .env file:', error.message);
    }
  } else {
    console.log(`✅ Alert chat ID confirmed: ${chatId}`);
  }

  const welcomeMessage = `
🤖 *Laxmi Wallet Tracker Bot*

Welcome! I'm monitoring ${tracker.wallets.length} Solana wallets and will send you real-time alerts when activity is detected.

*Quick Commands:*
/balance \[wallet\] - Check wallet balance
/activity \[wallet\] - Recent transactions
/mute - Pause alerts temporarily
/help - See all commands

*Alert Types:*
🚨 Large transactions (>10 SOL)
💰 Incoming transactions
📤 Outgoing transactions
🪙 Token transfers with amounts
📊 Balance changes with details

*What You'll See:*
• SOL amounts in every alert
• Token symbols and quantities
• Transaction fees
• Links to Solscan

The monitor is running every 60 seconds.
You'll receive detailed alerts automatically when wallet activity is detected.

Happy tracking! 🚀
  `.trim();

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

/**
 * /status - Show monitoring status
 */
bot.onText(/\/status/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  const tradingMode = paperTrading.isEnabled() ? '🧪 Paper Trading' : '💰 Real Trading';
  const statusMessage = `
📊 *Bot Status*

*Monitoring:* ${tracker.wallets.length} wallets
*Poll Interval:* 60 seconds
*Trading Mode:* ${tradingMode}
*Uptime:* ${hours}h ${minutes}m ${seconds}s
*Alerts Sent:* ${stats.alertsSent}
*Commands Received:* ${stats.commandsReceived}

*Status:* ✅ Active

Use \`/mode\` to toggle trading mode.
  `.trim();

  bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
});

/**
 * /wallets - List all tracked wallets
 */
bot.onText(/\/wallets/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  try {
    const summary = await tracker.getAllWalletsSummary();
    bot.sendMessage(chatId, `\`\`\`\n${summary}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching wallets: ${error.message}`);
  }
});

/**
 * /stats - Show detailed statistics
 */
bot.onText(/\/stats/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  const monitorStats = monitor.getStats();

  const statsMessage = `
📈 *Monitoring Statistics*

*Total Checks:* ${monitorStats.totalChecks}
*Total Alerts:* ${monitorStats.totalAlerts}
*Alerts Sent (Telegram):* ${stats.alertsSent}
*Last Check:* ${monitorStats.lastCheck ? new Date(monitorStats.lastCheck).toLocaleString() : 'Never'}

*Alert Breakdown:*
${Object.entries(monitorStats.alertsByType).map(([type, count]) =>
  `  • ${type}: ${count}`
).join('\n') || '  No alerts yet'}

*Error Count:* ${monitorStats.errors || 0}
  `.trim();

  bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
});

/**
 * /help - Show help message
 */
bot.onText(/\/help/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  const helpMessage = `
🤖 *Laxmi Wallet Tracker Bot - Help*

*Basic Commands:*
/start - Welcome message and setup
/status - View monitoring status
/wallets - List all tracked wallets with balances
/stats - Show detailed monitoring statistics
/help - Show this help message

*Paper Trading:*
/mode - Toggle paper trading on/off
/portfolio - View paper trading portfolio
/sell - Sell tokens from portfolio
/reset - Reset paper trading account

*Wallet Commands:*
/balance \[wallet\] - Quick balance check
/activity \[wallet\] - Recent transactions
/search \[signature\] - Look up transaction

*Bot Wallet Commands:*
/wallet - Show bot wallet balance
/deposit - Get deposit address
/send \[address\] \[amount\] - Send SOL from bot
/txhistory - View bot transaction history

*Alert Control:*
/mute - Temporarily disable all alerts
/unmute - Re-enable alerts

*AI Code Editor:*
/code \[instruction\] - Modify code with AI
/rollback - Undo last code change

*Alert Types:*
🚨 Large Transaction - Transactions over 10 SOL
💰 Incoming Transaction - SOL received
📤 Outgoing Transaction - SOL sent
🪙 Token Transfer - Token movements
📊 Balance Change - Any balance shift
🔔 New Transaction - General transaction alert

*Examples:*
\`/balance whale\`
\`/activity Magi2\`
\`/search 2GvgQi9NGem...\`
\`/code add a health check endpoint\`

*How It Works:*
The bot checks all tracked wallets every 60 seconds. When activity is detected, you'll receive an instant alert with transaction details, SOL amounts, token info, and a link to view on Solscan.

For more info, see TELEGRAM_BOT.md
  `.trim();

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// ===== PAPER TRADING COMMANDS =====

/**
 * /mode - Toggle paper trading mode
 */
bot.onText(/\/mode/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  const enabled = paperTrading.toggle();
  const portfolio = paperTrading.getPortfolio();

  const message = enabled
    ? `🧪 *Paper Trading ENABLED*

All buy buttons will now execute simulated trades.
No real money will be spent.

*Starting Balance:* ${portfolio.balance.toFixed(4)} SOL
*Total Trades:* ${portfolio.stats.totalTrades}

Use \`/portfolio\` to view your paper holdings.
Use \`/reset\` to reset your paper account.
Use \`/mode\` again to switch back to real trading.`
    : `💰 *Real Trading ENABLED*

⚠️ *WARNING:* Buy buttons will now execute REAL trades with REAL money.

Make sure your bot wallet is funded.
Use \`/wallet\` to check balance.
Use \`/mode\` to switch back to paper trading.`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

/**
 * /portfolio - View paper trading portfolio with real-time prices
 */
bot.onText(/\/portfolio/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (!paperTrading.isEnabled()) {
    bot.sendMessage(chatId, '⚠️ Paper trading is not enabled. Use `/mode` to enable it.', { parse_mode: 'Markdown' });
    return;
  }

  // Send loading message
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Fetching real-time prices...');

  try {
    // Get portfolio with current prices
    const portfolio = await paperTrading.getPortfolioWithPrices();
    const statsData = paperTrading.getStats();

    // Format token holdings with real-time data
    let tokensText = '_No tokens held_';
    if (Object.keys(portfolio.tokens).length > 0) {
      tokensText = Object.entries(portfolio.tokens)
        .map(([mint, holding]) => {
          const mintShort = `${mint.slice(0, 6)}...${mint.slice(-4)}`;
          const pnlSign = holding.unrealizedPnL >= 0 ? '+' : '';
          const pnlEmoji = holding.unrealizedPnL >= 0 ? '📈' : '📉';

          return `  • ${holding.symbol || mintShort}: ${holding.amount.toLocaleString()} tokens
    Entry: $${holding.avgPrice.toFixed(8)}
    Current: $${holding.currentPrice.toFixed(8)}
    Value: ${holding.currentValue.toFixed(4)} SOL
    ${pnlEmoji} P&L: ${pnlSign}${holding.unrealizedPnL.toFixed(4)} SOL (${pnlSign}${holding.unrealizedPnLPercent.toFixed(2)}%)`;
        })
        .join('\n\n');
    }

    const totalPnLSign = (portfolio.totalUnrealizedPnL + portfolio.totalRealizedPnL) >= 0 ? '+' : '';
    const totalPnL = portfolio.totalUnrealizedPnL + portfolio.totalRealizedPnL;

    const message = `
📊 *Paper Trading Portfolio*

💰 *SOL Balance:* ${portfolio.balance.toFixed(4)} SOL

🪙 *Token Holdings:*
${tokensText}

📈 *Performance:*
• Current Value: ${portfolio.totalValue.toFixed(4)} SOL
• Unrealized P&L: ${portfolio.totalUnrealizedPnL >= 0 ? '+' : ''}${portfolio.totalUnrealizedPnL.toFixed(4)} SOL
• Realized P&L: ${portfolio.totalRealizedPnL >= 0 ? '+' : ''}${portfolio.totalRealizedPnL.toFixed(4)} SOL
• Total P&L: ${totalPnLSign}${totalPnL.toFixed(4)} SOL (${((totalPnL / statsData.startingBalance) * 100).toFixed(2)}%)

📊 *Trading Stats:*
• Total Trades: ${statsData.totalTrades}
• Win Rate: ${statsData.winRate.toFixed(1)}%
• Wins/Losses: ${statsData.wins}/${statsData.losses}

Use \`/sell\` to sell tokens.
Use \`/reset\` to reset account.
Use \`/mode\` to toggle trading mode.
    `.trim();

    // Delete loading message and send result
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    bot.sendMessage(chatId, '❌ Error fetching real-time prices. Showing cost basis instead.\n\nTry again in a moment.', { parse_mode: 'Markdown' });
  }
});

/**
 * /sell - Sell tokens from portfolio
 */
bot.onText(/\/sell/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (!paperTrading.isEnabled()) {
    bot.sendMessage(chatId, '⚠️ Paper trading is not enabled. Use `/mode` to enable it.', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const portfolio = await paperTrading.getPortfolioWithPrices();

    if (Object.keys(portfolio.tokens).length === 0) {
      bot.sendMessage(chatId, '📭 You have no tokens to sell.\n\nUse `/portfolio` to view your holdings.', { parse_mode: 'Markdown' });
      return;
    }

    // Create inline keyboard with sell options for each token
    const keyboard = [];

    for (const [mint, holding] of Object.entries(portfolio.tokens)) {
      const symbol = holding.symbol || `${mint.slice(0, 6)}...${mint.slice(-4)}`;
      const pnlSign = holding.unrealizedPnL >= 0 ? '+' : '';
      const pnlText = `${pnlSign}${holding.unrealizedPnLPercent.toFixed(1)}%`;

      // Add buttons for 25%, 50%, 100% sells
      keyboard.push([
        { text: `${symbol} (${pnlText})`, callback_data: `sell_info:${mint.slice(0, 12)}` }
      ]);
      keyboard.push([
        { text: '  25%', callback_data: `sell:25:${mint.slice(0, 12)}` },
        { text: '  50%', callback_data: `sell:50:${mint.slice(0, 12)}` },
        { text: '  100%', callback_data: `sell:100:${mint.slice(0, 12)}` }
      ]);
    }

    const message = `
💰 *Sell Tokens*

Select a token and percentage to sell:

📝 *Current Holdings:*
${Object.entries(portfolio.tokens).map(([mint, h]) => {
  const s = h.symbol || mint.slice(0, 8);
  return `  • ${s}: ${h.amount.toLocaleString()} (${h.unrealizedPnL >= 0 ? '+' : ''}${h.unrealizedPnLPercent.toFixed(1)}%)`;
}).join('\n')}
    `.trim();

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

  } catch (error) {
    console.error('Error in /sell command:', error);
    bot.sendMessage(chatId, '❌ Error loading portfolio. Please try again.', { parse_mode: 'Markdown' });
  }
});

/**
 * /reset - Reset paper trading account
 */
bot.onText(/\/reset/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (!paperTrading.isEnabled()) {
    bot.sendMessage(chatId, '⚠️ Paper trading is not enabled. Use `/mode` to enable it first.', { parse_mode: 'Markdown' });
    return;
  }

  paperTrading.reset(1.0);

  bot.sendMessage(chatId, `
✅ *Paper Trading Account Reset*

Your paper trading account has been reset to initial state:
• Balance: 1.0 SOL
• All tokens sold
• Stats cleared

Use \`/portfolio\` to view your fresh account.
  `.trim(), { parse_mode: 'Markdown' });
});

/**
 * /balance [wallet] - Quick balance check
 */
bot.onText(/\/balance(?:\s+(.+))?/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;
  const walletName = match[1]?.trim();

  if (!walletName) {
    bot.sendMessage(chatId, '❌ Please specify a wallet name.\n\nUsage: `/balance whale`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const wallet = tracker.getWalletByName(walletName);
    if (!wallet) {
      bot.sendMessage(chatId, `❌ Wallet "${walletName}" not found.`);
      return;
    }

    const balance = await tracker.getBalance(wallet.trackedWalletAddress);
    const message = `
💰 *Balance Check*

${wallet.emoji} *${wallet.name}*
Balance: \`${balance.toFixed(4)} SOL\`
Address: \`${wallet.trackedWalletAddress.slice(0, 8)}...${wallet.trackedWalletAddress.slice(-8)}\`

[View on Solscan](https://solscan.io/account/${wallet.trackedWalletAddress})
    `.trim();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching balance: ${error.message}`);
  }
});

/**
 * /activity [wallet] - Recent transactions
 */
bot.onText(/\/activity(?:\s+(.+))?/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;
  const walletName = match[1]?.trim();

  if (!walletName) {
    bot.sendMessage(chatId, '❌ Please specify a wallet name.\n\nUsage: `/activity whale`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const wallet = tracker.getWalletByName(walletName);
    if (!wallet) {
      bot.sendMessage(chatId, `❌ Wallet "${walletName}" not found.`);
      return;
    }

    bot.sendMessage(chatId, `🔍 Fetching recent activity for ${wallet.emoji} ${wallet.name}...`);

    const txs = await tracker.getRecentTransactions(wallet.trackedWalletAddress, 5);

    if (txs.length === 0) {
      bot.sendMessage(chatId, `No recent transactions found for ${wallet.name}.`);
      return;
    }

    let message = `📜 *Recent Activity: ${wallet.emoji} ${wallet.name}*\n\n`;

    for (let i = 0; i < Math.min(txs.length, 5); i++) {
      const tx = txs[i];
      const time = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown';
      const status = tx.err ? '❌' : '✅';
      message += `${i + 1}. ${status} [${tx.signature.slice(0, 8)}...](https://solscan.io/tx/${tx.signature})\n`;
      message += `   ${time}\n\n`;
    }

    message += `[View all on Solscan](https://solscan.io/account/${wallet.trackedWalletAddress})`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching activity: ${error.message}`);
  }
});

/**
 * /mute - Mute alerts
 */
bot.onText(/\/mute/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (alertsMuted) {
    bot.sendMessage(chatId, '🔇 Alerts are already muted.');
    return;
  }

  alertsMuted = true;
  bot.sendMessage(chatId, '🔇 *Alerts Muted*\n\nYou will not receive any alerts until you use `/unmute`.', { parse_mode: 'Markdown' });
});

/**
 * /unmute - Unmute alerts
 */
bot.onText(/\/unmute/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (!alertsMuted) {
    bot.sendMessage(chatId, '🔔 Alerts are already active.');
    return;
  }

  alertsMuted = false;
  bot.sendMessage(chatId, '🔔 *Alerts Unmuted*\n\nYou will now receive alerts for wallet activity.', { parse_mode: 'Markdown' });
});

/**
 * /search [signature] - Search transaction
 */
bot.onText(/\/search(?:\s+(.+))?/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;
  const signature = match[1]?.trim();

  if (!signature) {
    bot.sendMessage(chatId, '❌ Please provide a transaction signature.\n\nUsage: `/search 2GvgQi9NGem...`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    bot.sendMessage(chatId, '🔍 Looking up transaction...');

    const details = await tracker.getTransactionDetails(signature);

    const solChanges = Object.entries(details.balanceChanges || {})
      .map(([addr, change]) => `  • \`${addr.slice(0, 8)}...\`: ${change > 0 ? '+' : ''}${change.toFixed(4)} SOL`)
      .join('\n');

    const tokens = details.tokenTransfers && details.tokenTransfers.length > 0
      ? details.tokenTransfers.slice(0, 3).map(t =>
          `  • ${t.amount || 'Unknown'} ${t.symbol || t.mint.slice(0, 8) + '...'}`
        ).join('\n')
      : '  None';

    const message = `
🔍 *Transaction Details*

*Signature:* \`${signature.slice(0, 16)}...\`
*Status:* ${details.success ? '✅ Success' : '❌ Failed'}
*Fee:* ${details.fee ? details.fee.toFixed(6) : 'Unknown'} SOL

*SOL Changes:*
${solChanges || '  None'}

*Token Transfers:*
${tokens}

[View on Solscan](https://solscan.io/tx/${signature})
    `.trim();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching transaction: ${error.message}\n\nMake sure the signature is valid.`);
  }
});

/**
 * /code [instruction] - AI-powered code editing
 */
bot.onText(/\/code(?:\s+(.+))?/s, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;
  const instruction = match[1]?.trim();

  if (!openai) {
    bot.sendMessage(chatId, '❌ OpenAI API key not configured. Cannot use /code command.');
    return;
  }

  if (!instruction) {
    bot.sendMessage(chatId, '❌ Please provide an instruction.\n\nUsage: `/code add a function to calculate fibonacci numbers`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    bot.sendMessage(chatId, '🤖 *AI Code Editor Activated*\n\nAnalyzing your request...', { parse_mode: 'Markdown' });

    // Use OpenAI to understand the instruction and generate code
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert code editor. You can read, modify, and create files in a Node.js project.

The project structure:
- /root/telegram-bot.js - Main Telegram bot file
- /root/src/tracker.js - Wallet tracker
- /root/src/alerts.js - Alert system
- /root/wallets.json - Wallet configuration
- /root/package.json - Package manifest
- /root/.env - Environment variables (NEVER expose secrets)

When given an instruction:
1. Determine which files need to be modified
2. Provide the exact file path(s)
3. Provide the complete new content for each file OR specific edits

Respond in JSON format:
{
  "analysis": "Brief explanation of what you'll do",
  "files": [
    {
      "path": "/root/filename.js",
      "action": "create" or "modify",
      "content": "full file content here"
    }
  ],
  "summary": "What was changed"
}

IMPORTANT:
- For modifications, provide the COMPLETE new file content
- Be careful with existing code - don't break anything
- Never expose API keys or secrets
- Test your changes mentally before responding`
        },
        {
          role: 'user',
          content: instruction
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);

    bot.sendMessage(chatId, `📝 *Analysis:* ${aiResponse.analysis}\n\nExecuting changes...`, { parse_mode: 'Markdown' });

    // Apply the changes
    const changedFiles = [];
    for (const file of aiResponse.files) {
      const filePath = file.path;

      // Security check - only allow files in /root
      if (!filePath.startsWith('/root/')) {
        continue;
      }

      // Backup original if it exists
      const existed = existsSync(filePath);
      let backup = null;
      if (existed) {
        backup = readFileSync(filePath, 'utf-8');
      }

      // Write the new content
      writeFileSync(filePath, file.content, 'utf-8');

      changedFiles.push({
        path: filePath,
        action: file.action,
        existed,
        backup
      });
    }

    // Report results
    const filesChanged = changedFiles.map(f => {
      const filename = f.path.split('/').pop();
      const action = f.action === 'create' ? '✨ Created' : '📝 Modified';
      return `  ${action}: \`${filename}\``;
    }).join('\n');

    const resultMessage = `
✅ *Code Changes Applied*

${filesChanged}

*Summary:* ${aiResponse.summary}

Files have been updated. The bot will need to be restarted if you modified telegram-bot.js.
    `.trim();

    bot.sendMessage(chatId, resultMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Code editing error:', error);
    bot.sendMessage(chatId, `❌ Error executing code changes: ${error.message}`);
  }
});

/**
 * /rollback - Rollback last code change (if available)
 */
let lastCodeChanges = null;

bot.onText(/\/rollback/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  if (!lastCodeChanges || lastCodeChanges.length === 0) {
    bot.sendMessage(chatId, '❌ No recent code changes to rollback.');
    return;
  }

  try {
    // Rollback changes
    for (const change of lastCodeChanges) {
      if (change.backup) {
        writeFileSync(change.path, change.backup, 'utf-8');
      }
    }

    bot.sendMessage(chatId, '✅ Changes rolled back successfully!');
    lastCodeChanges = null;
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error rolling back: ${error.message}`);
  }
});

// ===== WALLET COMMANDS =====

/**
 * /wallet - Show bot wallet info
 */
bot.onText(/\/wallet$/,async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  try {
    if (!botWallet.wallet) {
      bot.sendMessage(chatId, '❌ Bot wallet not configured.');
      return;
    }

    const publicKey = botWallet.getPublicKey();
    const balance = await botWallet.getBalance();

    const message = `
💼 *Bot Wallet*

*Address:* \`${publicKey}\`
*Balance:* ${balance.toFixed(4)} SOL

Send SOL to this address to fund the bot for trading.

[View on Solscan](https://solscan.io/account/${publicKey})
    `.trim();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching wallet info: ${error.message}`);
  }
});

/**
 * /deposit - Show deposit address
 */
bot.onText(/\/deposit/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  try {
    if (!botWallet.wallet) {
      bot.sendMessage(chatId, '❌ Bot wallet not configured.');
      return;
    }

    const publicKey = botWallet.getPublicKey();

    const message = `
💰 *Deposit SOL*

Send SOL to this address:
\`${publicKey}\`

The bot will use these funds for trading operations.

⚠️ Only send SOL on Solana mainnet!
    `.trim();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

/**
 * /send [address] [amount] - Send SOL
 */
bot.onText(/\/send(?:\s+(.+))?/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  const args = match[1]?.trim().split(/\s+/);

  if (!args || args.length < 2) {
    bot.sendMessage(chatId, '❌ Usage: `/send [address] [amount]`\n\nExample: `/send Ay2VRpYK...WkSna 0.1`', { parse_mode: 'Markdown' });
    return;
  }

  const [toAddress, amountStr] = args;
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    bot.sendMessage(chatId, '❌ Invalid amount. Must be a positive number.');
    return;
  }

  try {
    if (!botWallet.wallet) {
      bot.sendMessage(chatId, '❌ Bot wallet not configured.');
      return;
    }

    // Check balance
    const balance = await botWallet.getBalance();
    if (balance < amount) {
      bot.sendMessage(chatId, `❌ Insufficient balance. You have ${balance.toFixed(4)} SOL but trying to send ${amount} SOL.`);
      return;
    }

    bot.sendMessage(chatId, `⏳ Sending ${amount} SOL to \`${toAddress.slice(0, 8)}...\`\n\nPlease wait...`, { parse_mode: 'Markdown' });

    const result = await botWallet.sendSol(toAddress, amount);

    const message = `
✅ *Transaction Successful*

*Amount:* ${amount} SOL
*To:* \`${toAddress.slice(0, 8)}...${toAddress.slice(-8)}\`
*Signature:* \`${result.signature.slice(0, 16)}...\`

[View on Solscan](https://solscan.io/tx/${result.signature})
    `.trim();

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Transaction failed: ${error.message}`);
  }
});

/**
 * /txhistory - Show bot wallet transaction history
 */
bot.onText(/\/txhistory/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  try {
    if (!botWallet.wallet) {
      bot.sendMessage(chatId, '❌ Bot wallet not configured.');
      return;
    }

    bot.sendMessage(chatId, '🔍 Fetching transaction history...');

    const transactions = await botWallet.getRecentTransactions(5);

    if (transactions.length === 0) {
      bot.sendMessage(chatId, 'No transactions found for bot wallet.');
      return;
    }

    let message = `📜 *Bot Wallet Transaction History*\n\n`;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const time = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown';
      const status = tx.err ? '❌' : '✅';
      message += `${i + 1}. ${status} [${tx.signature.slice(0, 8)}...](https://solscan.io/tx/${tx.signature})\n`;
      message += `   ${time}\n\n`;
    }

    const publicKey = botWallet.getPublicKey();
    message += `[View all on Solscan](https://solscan.io/account/${publicKey})`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching history: ${error.message}`);
  }
});

// ===== BUY BUTTON CALLBACKS =====

// Transaction cache for buy buttons (signature prefix -> transaction details)
const recentTransactions = new Map();

// Add test transaction for testing buy functionality
recentTransactions.set('Rk3K9oy6', {
  signature: 'Rk3K9oy6MEptqV9WMkgMzmQaHw1A6mDS8poasXsF2t7Xfb79HUkNfx34o7WvZx7iCqEQiPDyWgsrZ8X4GCpncgr',
  wallet: {
    address: 'EHXRqrpttvDLXxsgvav5mHQ8RX7pcUZd2nCzystxmYGe',
    name: 'lurking',
    emoji: '👻'
  },
  tokenTransfers: [{
    mint: 'kh35nynonqA4VYaoeAvn17ChrhMrWhJ26EbCayKpump',
    symbol: 'TEST',
    amount: 700167.89
  }],
  balanceChanges: {},
  timestamp: new Date().toISOString()
});
console.log('🧪 Test transaction loaded for buy testing (key: Rk3K9oy6)');

/**
 * Handle buy button clicks from alerts
 */
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;

  // Security check
  if (!isOwner(userId)) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ Unauthorized',
      show_alert: true
    });
    return;
  }

  try {
    const parts = data.split(':');
    const action = parts[0];

    if (action === 'buy') {
      // Buy with fixed amount: buy:amount:shortSig
      const [, amountStr, shortSig] = parts;
      const amount = parseFloat(amountStr);
      const txDetails = recentTransactions.get(shortSig);

      if (!txDetails) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Transaction expired. Please wait for new alert.',
          show_alert: true
        });
        return;
      }

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `🔄 Processing ${paperTrading.isEnabled() ? 'paper' : 'real'} buy of ${amount} SOL...`
      });

      // Check if paper trading is enabled
      if (paperTrading.isEnabled()) {
        // PAPER TRADING MODE
        const portfolio = paperTrading.getPortfolio();

        if (portfolio.balance < amount) {
          await bot.sendMessage(msg.chat.id, `❌ Insufficient paper balance. You have ${portfolio.balance.toFixed(4)} SOL but need ${amount} SOL.

Use \`/reset\` to get more paper money.`, { parse_mode: 'Markdown' });
          return;
        }
      } else {
        // REAL TRADING MODE
        if (!botWallet.wallet) {
          await bot.sendMessage(msg.chat.id, '❌ Bot wallet not configured. Use `/wallet` to set up.', { parse_mode: 'Markdown' });
          return;
        }

        const balance = await botWallet.getBalance();
        if (balance < amount) {
          await bot.sendMessage(msg.chat.id, `❌ Insufficient balance. You have ${balance.toFixed(4)} SOL but need ${amount} SOL.`);
          return;
        }
      }

      // Extract token mint from transaction
      const tokenTransfers = txDetails.tokenTransfers || [];
      if (tokenTransfers.length === 0) {
        await bot.sendMessage(msg.chat.id, '❌ No token transfers found in this transaction. Cannot determine what to buy.');
        return;
      }

      // Get the first token that was received (assuming it's what they want to buy)
      const tokenToBuy = tokenTransfers.find(t => t.amount && t.amount > 0);
      if (!tokenToBuy || !tokenToBuy.mint) {
        await bot.sendMessage(msg.chat.id, '❌ Could not identify token to buy from transaction.');
        return;
      }

      try {
        if (paperTrading.isEnabled()) {
          // ===== PAPER TRADING EXECUTION =====

          // Get token analysis for price and symbol
          const analysis = await tokenAnalyzer.getTokenMetadata(tokenToBuy.mint);
          const pricePerToken = analysis?.price || 0.0001; // Fallback price
          const tokenSymbol = analysis?.symbol || tokenToBuy.symbol || tokenToBuy.mint.slice(0, 8) + '...';

          await bot.sendMessage(msg.chat.id, `
🧪 *Executing Paper Trade*

*Spending:* ${amount} SOL
*Token:* ${tokenSymbol}
*Mode:* Paper Trading (Simulated)

Simulating trade...
          `.trim(), { parse_mode: 'Markdown' });

          // Execute paper trade
          const result = await paperTrading.buy(
            tokenToBuy.mint,
            tokenSymbol,
            amount,
            pricePerToken
          );

          const successMsg = `
✅ *Paper Trade Executed!*

*Input:* ${amount} SOL
*Output:* ${result.trade.tokensReceived.toLocaleString()} ${tokenSymbol}
*Price:* $${pricePerToken.toFixed(8)} per token

📊 *Your Paper Portfolio:*
• SOL Balance: ${result.portfolio.balance.toFixed(4)} SOL
• Total Trades: ${result.portfolio.stats.totalTrades}
• ${tokenSymbol}: ${result.portfolio.tokens[tokenToBuy.mint].amount.toLocaleString()} tokens

*Original Alert TX:* [View](https://solscan.io/tx/${txDetails.signature})

Use \`/portfolio\` to see full portfolio.
Use \`/mode\` to switch to real trading.
          `.trim();

          await bot.sendMessage(msg.chat.id, successMsg, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });

        } else {
          // ===== REAL TRADING EXECUTION =====

          // Get token analysis for symbol
          const analysis = await tokenAnalyzer.getTokenMetadata(tokenToBuy.mint);
          const tokenSymbol = analysis?.symbol || tokenToBuy.symbol || tokenToBuy.mint.slice(0, 8) + '...';

          await bot.sendMessage(msg.chat.id, `
⏳ *Executing Real Swap via Jupiter*

*Spending:* ${amount} SOL
*Token:* ${tokenSymbol}
*Slippage:* 1%

Getting best price across all DEXs...
          `.trim(), { parse_mode: 'Markdown' });

          // Execute swap using Jupiter with API key
          const swapResult = await jupiterTrader.buySolToToken(tokenToBuy.mint, amount, 100);

          // Success message
          const successMsg = `
✅ *Swap Successful!*

*Input:* ${amount} SOL
*Output:* ~${(swapResult.outputAmount / 1e9).toFixed(4)} ${tokenSymbol}
*Price Impact:* ${swapResult.priceImpact}%

*Swap TX:* [View on Solscan](https://solscan.io/tx/${swapResult.signature})
*Original Alert TX:* [View](https://solscan.io/tx/${txDetails.signature})

[View your wallet](https://solscan.io/account/${botWallet.getPublicKey()})
          `.trim();

          await bot.sendMessage(msg.chat.id, successMsg, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });
        }

      } catch (error) {
        console.error('❌ Buy failed:', error);

        // Provide fallback Jupiter link on error
        const jupiterUrl = `https://jup.ag/swap/SOL-${tokenToBuy.mint}`;
        await bot.sendMessage(msg.chat.id, `❌ *Automatic Swap Failed*

${error.message}

**Fallback Option:**
[→ Open Jupiter Manually](${jupiterUrl})

Copy token mint: \`${tokenToBuy.mint}\`

[View wallet](https://solscan.io/account/${botWallet.getPublicKey()})`, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      }

    } else if (action === 'custom') {
      // Custom amount: custom:shortSig
      const [, shortSig] = parts;
      const txDetails = recentTransactions.get(shortSig);

      if (!txDetails) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Transaction expired',
          show_alert: true
        });
        return;
      }

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '💬 Send amount in next message'
      });

      const tokenTransfers = txDetails.tokenTransfers || [];
      const token = tokenTransfers.find(t => t.amount && t.amount > 0);
      const tokenInfo = token ? (token.symbol || token.mint.slice(0, 8) + '...') : 'Unknown';

      await bot.sendMessage(msg.chat.id, `
💰 *Custom Buy Amount*

Token: ${tokenInfo}
Related TX: [View](https://solscan.io/tx/${txDetails.signature})

Reply with the SOL amount you want to spend.

Example: \`0.25\`

_Note: Use the /send command format if needed._
      `.trim(), { parse_mode: 'Markdown', disable_web_page_preview: true });

      // Store pending custom buy (you'd implement this with a state manager)
      // For now, user would need to use /send command

    } else if (action === 'copy') {
      // Copy trade: copy:shortSig
      const [, shortSig] = parts;
      const txDetails = recentTransactions.get(shortSig);

      if (!txDetails) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Transaction expired',
          show_alert: true
        });
        return;
      }

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '🔄 Analyzing transaction...'
      });

      // TODO: Calculate proportional trade based on wallet balances
      // For now, suggest manual amount
      const tokenTransfers = txDetails.tokenTransfers || [];
      const token = tokenTransfers.find(t => t.amount && t.amount > 0);
      const tokenInfo = token ? (token.symbol || token.mint.slice(0, 8) + '...') : 'Unknown';

      const confirmMsg = `
📋 *Copy Trade*

*Token:* ${tokenInfo}
*Original TX:* [View](https://solscan.io/tx/${txDetails.signature})
*Whale Wallet:* ${txDetails.wallet.emoji} ${txDetails.wallet.name}

⚠️ *Manual Copy Required*
Use the buy buttons above to copy this trade with your desired amount.

Recommended: Start with 0.01-0.1 SOL to test.

[Track your wallet](https://solscan.io/account/${botWallet.getPublicKey()})
      `.trim();

      await bot.sendMessage(msg.chat.id, confirmMsg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

    } else if (action === 'sell') {
      // Sell token: sell:percentage:shortMint
      const [, percentageStr, shortMint] = parts;
      const percentage = parseFloat(percentageStr);

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `🔄 Selling ${percentage}% of position...`
      });

      try {
        // Get current portfolio to find the full mint address
        const portfolio = await paperTrading.getPortfolioWithPrices();

        // Find the token by matching the short mint
        const fullMint = Object.keys(portfolio.tokens).find(mint => mint.startsWith(shortMint));

        if (!fullMint) {
          await bot.sendMessage(msg.chat.id, '❌ Token not found in portfolio. Please use `/portfolio` to check your holdings.', { parse_mode: 'Markdown' });
          return;
        }

        const holding = portfolio.tokens[fullMint];
        const tokenAmount = (holding.amount * percentage) / 100;
        const currentPrice = holding.currentPrice;

        // Execute paper sell
        const result = await paperTrading.sell(fullMint, tokenAmount, currentPrice);

        const pnlEmoji = result.trade.profit >= 0 ? '📈' : '📉';
        const pnlSign = result.trade.profit >= 0 ? '+' : '';

        const successMsg = `
✅ *Sell Order Executed!*

*Token:* ${holding.symbol || fullMint.slice(0, 8) + '...'}
*Amount Sold:* ${tokenAmount.toLocaleString()} tokens (${percentage}%)
*Price:* $${currentPrice.toFixed(8)}
*SOL Received:* ${result.trade.solReceived.toFixed(4)} SOL

${pnlEmoji} *Profit/Loss:* ${pnlSign}${result.trade.profit.toFixed(4)} SOL (${pnlSign}${result.trade.profitPercent.toFixed(2)}%)

📊 *Updated Portfolio:*
• SOL Balance: ${result.portfolio.balance.toFixed(4)} SOL
• Total Trades: ${result.portfolio.stats.totalTrades}
• Win Rate: ${((result.portfolio.stats.wins / (result.portfolio.stats.wins + result.portfolio.stats.losses || 1)) * 100).toFixed(1)}%

Use \`/portfolio\` to see full portfolio.
        `.trim();

        await bot.sendMessage(msg.chat.id, successMsg, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('❌ Sell failed:', error);
        await bot.sendMessage(msg.chat.id, `❌ *Sell Failed*\n\n${error.message}\n\nUse \`/portfolio\` to check your holdings.`, { parse_mode: 'Markdown' });
      }

    } else if (action === 'sell_info') {
      // Show info about a token (not implemented yet, just acknowledge)
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Select percentage below to sell'
      });
    }

  } catch (error) {
    console.error('Error handling callback:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `❌ Error: ${error.message}`,
      show_alert: true
    });
  }
});

// ===== ALERT HANDLERS =====

/**
 * Escape markdown special characters
 */
function escapeMarkdown(text) {
  if (!text) return '';
  // Only escape characters that break Telegram markdown
  // Don't escape: . , - numbers (they're safe in regular text)
  return text.toString().replace(/[_*[\]()~`>#+=|{}]/g, '\\$&');
}

/**
 * Format alert message for Telegram
 */
function formatAlert(alert, alertType) {
  // Defensive checks
  if (!alert || !alert.wallet) {
    console.error('Invalid alert object:', alert);
    return '❌ Error: Invalid alert data';
  }

  const { wallet, timestamp } = alert;

  // Some alerts have balance instead of transaction
  if (!alert.transaction && alert.balance) {
    // Handle BALANCE_CHANGE alerts
    const { balance } = alert;
    const changeAmount = Math.abs(balance.change);
    const direction = balance.change > 0 ? '📈 Increased' : '📉 Decreased';

    return `
📊 *Balance Change*

*Wallet:* ${wallet.emoji} ${wallet.name}
*Change:* ${direction} by ${changeAmount.toFixed(4)} SOL
*Old Balance:* ${balance.old.toFixed(4)} SOL
*New Balance:* ${balance.new.toFixed(4)} SOL
*Time:* ${new Date(timestamp).toLocaleString()}

[View Wallet](https://solscan.io/account/${wallet.address})
    `.trim();
  }

  if (!alert.transaction) {
    console.error('Alert missing transaction data:', alert);
    return '❌ Error: Alert missing transaction data';
  }

  const transaction = alert.transaction;

  // Choose emoji and title based on alert type
  let emoji = '🔔';
  let title = 'New Activity';

  switch (alertType) {
    case AlertType.LARGE_TRANSACTION:
      emoji = '🚨';
      title = 'Large Transaction Detected';
      break;
    case AlertType.TRANSACTION_RECEIVED:
      emoji = '💰';
      title = 'Incoming Transaction';
      break;
    case AlertType.TRANSACTION_SENT:
      emoji = '📤';
      title = 'Outgoing Transaction';
      break;
    case AlertType.TOKEN_TRANSFER:
      emoji = '🪙';
      title = 'Token Transfer';
      break;
    case AlertType.BALANCE_CHANGE:
      emoji = '📊';
      title = 'Balance Change';
      break;
    case AlertType.NEW_TRANSACTION:
      emoji = '🔔';
      title = 'New Transaction';
      break;
  }

  // Extract SOL amount from transaction
  let solAmount = transaction.amount;
  if (!solAmount && transaction.balanceChanges) {
    const walletChange = transaction.balanceChanges[wallet.address];
    if (walletChange !== undefined && walletChange !== 0) {
      solAmount = Math.abs(walletChange);
    }
  }

  // Format SOL amount
  const amountText = solAmount
    ? `${solAmount.toFixed(4)} SOL`
    : '';

  // Format token transfers
  let tokenInfo = '';
  if (transaction.tokenTransfers && Array.isArray(transaction.tokenTransfers) && transaction.tokenTransfers.length > 0) {
    try {
      const tokens = transaction.tokenTransfers
        .slice(0, 3) // Show max 3 tokens
        .map(t => {
          if (!t) return null;
          const amount = t.amount ? t.amount.toLocaleString() : 'Unknown';
          const symbol = t.symbol || (t.mint ? `${t.mint.slice(0, 6)}...${t.mint.slice(-4)}` : 'Unknown');
          // Format amount with sign
          const sign = t.amount > 0 ? '+' : '';
          return `  ${sign}${amount} ${symbol}`;
        })
        .filter(t => t !== null)
        .join('\n');

      if (tokens) {
        tokenInfo = `\n\n📦 *Tokens:*\n${tokens}`;
        if (transaction.tokenTransfers.length > 3) {
          tokenInfo += `\n  _...and ${transaction.tokenTransfers.length - 3} more_`;
        }
      }
    } catch (error) {
      console.error('Error formatting tokens:', error);
    }
  }

  // Format fee
  const feeText = transaction.fee
    ? `\n*Fee:* ${transaction.fee.toFixed(6)} SOL`
    : '';

  // Build message
  let message = `
${emoji} *${title}*

*Wallet:* ${wallet.emoji} ${wallet.name}`;

  if (amountText) {
    message += `\n*SOL Amount:* ${amountText}`;
  }

  message += tokenInfo;
  message += feeText;
  message += `\n*Status:* ${transaction.success ? '✅ Success' : '❌ Failed'}`;
  message += `\n*Time:* ${new Date(timestamp).toLocaleString()}`;
  message += `\n\n[View on Solscan](https://solscan.io/tx/${transaction.signature})`;

  // Add AI-generated thesis if available
  if (alert.thesis && alert.thesis.thesis) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += thesisAgent.formatForTelegram(alert.thesis);
  }

  return message.trim();
}

/**
 * Send alert to Telegram
 */
async function sendAlert(alert, alertType) {
  if (!alertChatId) {
    console.log('⚠️  No chat ID set. Use /start to enable alerts.');
    return;
  }

  if (alertsMuted) {
    console.log(`🔇 Alert muted: ${alertType} for ${alert.wallet.name}`);
    return;
  }

  try {
    const message = formatAlert(alert, alertType);

    // Only add buy buttons for alerts with transactions (not balance changes)
    const messageOptions = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    if (alert.transaction && alert.transaction.signature) {
      // Cache transaction details for buy buttons
      const shortSig = alert.transaction.signature.slice(0, 8);
      recentTransactions.set(shortSig, {
        signature: alert.transaction.signature,
        wallet: alert.wallet,
        tokenTransfers: alert.transaction.tokenTransfers || [],
        balanceChanges: alert.transaction.balanceChanges || {},
        timestamp: alert.timestamp
      });

      // Clean old transactions (keep last 100)
      if (recentTransactions.size > 100) {
        const firstKey = recentTransactions.keys().next().value;
        recentTransactions.delete(firstKey);
      }

      // Create inline keyboard with buy options
      // Use shortened signature (first 8 chars) to fit in Telegram's 64-byte callback_data limit
      messageOptions.reply_markup = {
        inline_keyboard: [
          [
            { text: '🛒 Buy 0.01 SOL', callback_data: `buy:0.01:${shortSig}` },
            { text: '🛒 Buy 0.05 SOL', callback_data: `buy:0.05:${shortSig}` }
          ],
          [
            { text: '🛒 Buy 0.1 SOL', callback_data: `buy:0.1:${shortSig}` },
            { text: '🛒 Buy 0.5 SOL', callback_data: `buy:0.5:${shortSig}` }
          ],
          [
            { text: '💰 Custom Amount', callback_data: `custom:${shortSig}` }
          ],
          [
            { text: '📋 Copy Trade', callback_data: `copy:${shortSig}` }
          ]
        ]
      };
    }

    await bot.sendMessage(alertChatId, message, messageOptions);
    stats.alertsSent++;
    console.log(`✅ Alert sent: ${alertType} for ${alert.wallet.name}`);
  } catch (error) {
    // Handle group upgrade to supergroup
    if (error.message && error.message.includes('group chat was upgraded')) {
      console.error('🔄 Group was upgraded to supergroup. Chat ID needs updating.');
      console.error('   Please send /start in the NEW supergroup to get the new chat ID.');
      return;
    }
    console.error('❌ Error sending alert:', error.message);
  }
}

// ===== MONITOR EVENT LISTENERS =====

monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
  await sendAlert(alert, AlertType.LARGE_TRANSACTION);
});

monitor.on(AlertType.TRANSACTION_RECEIVED, async (alert) => {
  await sendAlert(alert, AlertType.TRANSACTION_RECEIVED);
});

monitor.on(AlertType.TRANSACTION_SENT, async (alert) => {
  await sendAlert(alert, AlertType.TRANSACTION_SENT);
});

monitor.on(AlertType.TOKEN_TRANSFER, async (alert) => {
  // Generate AI thesis for token transfers
  try {
    const tokenTransfers = alert.transaction?.tokenTransfers || [];

    if (tokenTransfers.length > 0) {
      // Analyze the first token (usually the main one)
      const tokenToBuy = tokenTransfers.find(t => t.amount && t.amount > 0);

      if (tokenToBuy && tokenToBuy.mint) {
        console.log(`🤖 Generating thesis for ${tokenToBuy.symbol || tokenToBuy.mint.slice(0, 8)}...`);

        // Analyze token
        const analysis = await tokenAnalyzer.analyzeToken(tokenToBuy.mint, alert.wallet.trackedWalletAddress);

        if (analysis.success) {
          // Generate scoring
          const scoring = tokenAnalyzer.scoreToken(analysis);
          analysis.scoring = scoring;

          // Generate AI thesis
          const thesisResult = await thesisAgent.generateThesis(
            analysis,
            alert.wallet,
            alert.transaction
          );

          // Add thesis to alert for display
          alert.thesis = thesisResult;
          alert.analysis = analysis;

          console.log(`✅ Thesis: ${thesisResult.recommendation} (Score: ${thesisResult.score}/100)`);
        }
      }
    }
  } catch (error) {
    console.error('Error generating thesis:', error.message);
    // Continue sending alert even if thesis generation fails
  }

  await sendAlert(alert, AlertType.TOKEN_TRANSFER);
});

// Disabled - BALANCE_CHANGE alerts are redundant (every transaction changes balance)
// monitor.on(AlertType.BALANCE_CHANGE, async (alert) => {
//   await sendAlert(alert, AlertType.BALANCE_CHANGE);
// });

monitor.on(AlertType.NEW_TRANSACTION, async (alert) => {
  await sendAlert(alert, AlertType.NEW_TRANSACTION);
});

// Monitor error handling
monitor.on('error', (error) => {
  console.error('⚠️  Monitor error:', error.message);
  if (error.message.includes('429')) {
    console.log('   💡 Tip: Consider using a premium RPC endpoint to avoid rate limits');
  }
});

// ===== ERROR HANDLING =====

bot.on('polling_error', (error) => {
  console.error('❌ Telegram polling error:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('⚠️  Unhandled rejection:', error.message || error);
  // Don't exit - let the bot keep running
});

// ===== GRACEFUL SHUTDOWN =====

async function shutdown() {
  console.log('\n🛑 Shutting down bot...');

  try {
    await monitor.stop();
    console.log('✅ Monitor stopped');

    await bot.stopPolling();
    console.log('✅ Bot stopped');

    console.log('👋 Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ===== START BOT =====

async function start() {
  console.log('🤖 Laxmi Wallet Tracker - Telegram Bot');
  console.log('=====================================\n');

  console.log(`📊 Monitoring ${tracker.wallets.length} wallets:`);
  tracker.wallets.forEach(w => {
    console.log(`  ${w.emoji} ${w.name}: ${w.trackedWalletAddress.slice(0, 8)}...`);
  });

  console.log(`\n⏱️  Poll interval: 60 seconds`);
  console.log(`🚨 Large transaction threshold: 10 SOL`);
  console.log(`🔗 RPC Endpoint: ${RPC_URL.includes('helius') ? 'Helius (Premium)' : 'Solana Public'}`);
  console.log(`💬 Chat ID: ${alertChatId || 'Not set (use /start)'}`);
  console.log(`🔐 Owner ID: ${OWNER_ID || 'Not set (⚠️  INSECURE)'}`);

  console.log('\n🚀 Starting monitor...');
  try {
    await monitor.start();
    console.log('✅ Monitor started\n');
  } catch (error) {
    console.error('⚠️  Monitor failed to start (possibly RPC rate limits)');
    console.error('   The bot will retry on the next poll interval');
    console.error('   Consider using a premium RPC endpoint for better reliability\n');
  }

  console.log('📱 Telegram bot is running!');
  console.log('   Send /start to the bot to begin receiving alerts.\n');
  console.log('Press Ctrl+C to stop.\n');
}

start().catch(error => {
  console.error('⚠️  Startup error:', error.message || error);
  console.log('Bot will continue running, but monitoring may be limited');
});
