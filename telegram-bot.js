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

/**
 * /start - Welcome message and setup
 */
bot.onText(/\/start/, async (msg) => {
  if (!isOwner(msg.from.id)) return;

  stats.commandsReceived++;
  const chatId = msg.chat.id;

  // Save chat ID for alerts
  if (!alertChatId) {
    alertChatId = chatId.toString();
    console.log(`✅ Alert chat ID set to: ${chatId}`);
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

  const statusMessage = `
📊 *Bot Status*

*Monitoring:* ${tracker.wallets.length} wallets
*Poll Interval:* 60 seconds
*Uptime:* ${hours}h ${minutes}m ${seconds}s
*Alerts Sent:* ${stats.alertsSent}
*Commands Received:* ${stats.commandsReceived}

*Status:* ✅ Active
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

// ===== ALERT HANDLERS =====

/**
 * Format alert message for Telegram
 */
function formatAlert(alert, alertType) {
  const { wallet, transaction, timestamp } = alert;

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
          const symbol = t.symbol || (t.mint ? t.mint.slice(0, 8) + '...' : 'Unknown');
          return `  • ${amount} ${symbol}`;
        })
        .filter(t => t !== null)
        .join('\n');

      if (tokens) {
        tokenInfo = `\n*Tokens:*\n${tokens}`;
        if (transaction.tokenTransfers.length > 3) {
          tokenInfo += `\n  _+ ${transaction.tokenTransfers.length - 3} more_`;
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
    await bot.sendMessage(alertChatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
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
  await sendAlert(alert, AlertType.TOKEN_TRANSFER);
});

monitor.on(AlertType.BALANCE_CHANGE, async (alert) => {
  await sendAlert(alert, AlertType.BALANCE_CHANGE);
});

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
