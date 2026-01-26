# Telegram Alert Bot

Real-time Solana wallet monitoring with instant Telegram notifications.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Alert Types](#alert-types)
6. [Customization](#customization)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)

---

## Overview

The Telegram Alert Bot sends you real-time notifications when your tracked Solana wallets have activity. Get instant alerts for:

- 🚨 Large transactions (>10 SOL)
- 💰 Incoming SOL
- 📤 Outgoing SOL
- 🪙 Token transfers
- 📊 Balance changes

The bot runs continuously, checking wallets every 15 seconds, and sends formatted alerts directly to your Telegram chat.

---

## Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` to create a new bot
3. Follow the prompts:
   - Choose a name (e.g., "Laxmi Wallet Monitor")
   - Choose a username (e.g., "laxmi_wallet_bot")
4. BotFather will give you a **bot token** - save this!

Example token format:
```
123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### Step 2: Get Your Chat ID

**Method 1: Use a Bot**
1. Search for **@userinfobot** on Telegram
2. Send it any message
3. It will reply with your user ID - this is your chat ID!

**Method 2: Use the API**
1. Send a message to your bot (the one you just created)
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":123456789}` in the JSON response
4. The number is your chat ID

### Step 3: Get Your Owner ID (Same as Chat ID for Personal Use)

For private bots, your owner ID is the same as your chat ID from Step 2.

This ID is used to restrict bot access - only messages from this user ID will be processed.

### Step 4: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Telegram credentials:
   ```bash
   nano .env
   # or
   vim .env
   ```

3. Add these lines (uncomment and fill in):
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
   TELEGRAM_CHAT_ID=123456789
   TELEGRAM_OWNER_ID=123456789
   ```

4. Save the file

### Step 5: Start the Bot

```bash
npm run telegram-bot
```

You should see:
```
🤖 Laxmi Wallet Tracker - Telegram Bot
=====================================

📊 Monitoring 7 wallets:
  🐳 whale: HYWo71Wk...
  👻 Magi2: 8aGTKmqG...
  ...

⏱️  Poll interval: 15 seconds
🚨 Large transaction threshold: 10 SOL
💬 Chat ID: 123456789
🔐 Owner ID: 123456789

🚀 Starting monitor...
✅ Monitor started

📱 Telegram bot is running!
   Send /start to the bot to begin receiving alerts.
```

### Step 6: Activate in Telegram

1. Open Telegram and go to your bot
2. Send `/start`
3. You'll receive a welcome message

That's it! You'll now receive alerts when wallet activity is detected.

---

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Bot token from @BotFather | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | ⚠️ Recommended | Your Telegram chat ID | `123456789` |
| `TELEGRAM_OWNER_ID` | ⚠️ Recommended | Your Telegram user ID (for security) | `123456789` |

**Notes:**
- Without `TELEGRAM_CHAT_ID`, you must send `/start` to the bot first
- Without `TELEGRAM_OWNER_ID`, the bot is accessible to anyone (not secure!)

### Monitor Settings

Edit `telegram-bot.js` to customize:

```javascript
const monitor = new WalletMonitor(tracker, {
  pollInterval: 15000,              // Check every 15 seconds
  largeTransactionThreshold: 10     // Alert on transactions >10 SOL
});
```

**Available Options:**
- `pollInterval`: Time between wallet checks (milliseconds)
  - Default: `15000` (15 seconds)
  - Min recommended: `10000` (10 seconds) to avoid rate limits

- `largeTransactionThreshold`: SOL amount for large transaction alerts
  - Default: `10` SOL
  - Adjust based on your wallet activity

### Bot Wallet Configuration

To enable trading features (copy trading, automated trading), you need to configure a wallet for the bot.

**⚠️ SECURITY WARNING:**
- Never share your private keys
- Store private keys securely in `.env` file
- Never commit `.env` to git
- Keep backups of your private keys

**Setup:**

1. Generate a new wallet or use an existing one
2. Add the private key to `.env`:
   ```env
   BOT_WALLET_PRIVATE_KEY=your_base58_encoded_private_key
   ```
3. Fund the wallet by sending SOL to the bot's address
4. Use `/wallet` command to view balance and address

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_WALLET_PRIVATE_KEY` | Optional | Base58-encoded private key for bot trading |
| `SOLANA_RPC_URL` | Optional | Custom RPC endpoint (default: public mainnet) |

**Example:**
```env
BOT_WALLET_PRIVATE_KEY=66GccuHKXAHj...
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

---

## Usage

### Bot Commands

Send these commands in your Telegram chat with the bot:

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and activate alerts |
| `/status` | View monitoring status and uptime |
| `/wallets` | List all tracked wallets with balances |
| `/stats` | Show detailed monitoring statistics |
| `/help` | Display help and command list |
| `/balance [wallet]` | Quick balance check for a specific wallet |
| `/activity [wallet]` | View recent transactions for a wallet |
| `/search [signature]` | Look up a transaction by signature |
| `/mute` | Temporarily disable all alerts |
| `/unmute` | Re-enable alerts |

**Bot Wallet Commands:**

| Command | Description |
|---------|-------------|
| `/wallet` | Show bot wallet address and balance |
| `/deposit` | Get deposit address for bot wallet |
| `/send [address] [amount]` | Send SOL from bot wallet |
| `/txhistory` | View bot wallet transaction history |

### Example Interactions

**Check Status:**
```
You: /status

Bot:
📊 Bot Status

Monitoring: 7 wallets
Poll Interval: 15 seconds
Uptime: 2h 34m 12s
Alerts Sent: 42
Commands Received: 8

Status: ✅ Active
```

**View Wallets:**
```
You: /wallets

Bot:
📊 Wallet Tracker Summary

🐳 whale: 347.5164 SOL
👻 Magi2: 0.2512 SOL
🌊 Sol_whale: 12.1234 SOL
...

💰 Total Balance: 696.4096 SOL
```

**Check Statistics:**
```
You: /stats

Bot:
📈 Monitoring Statistics

Total Checks: 8,492
Total Alerts: 156
Alerts Sent (Telegram): 156
Last Check: 1/20/2026, 10:35:42 AM

Alert Breakdown:
  • LARGE_TRANSACTION: 8
  • TRANSACTION_RECEIVED: 62
  • TRANSACTION_SENT: 54
  • TOKEN_TRANSFER: 32

Error Count: 0
```

**Bot Wallet Operations:**
```
You: /wallet

Bot:
💼 Bot Wallet

Address: `Ay2VRpYKjSEcctkzHw8GuZnua4zFaCsjLyQP6ggWkSna`
Balance: 0.0000 SOL

Send SOL to this address to fund the bot for trading.

[View on Solscan]
```

```
You: /send Ay2VRpYKjSEcctkzHw8GuZnua4zFaCsjLyQP6ggWkSna 0.1

Bot:
✅ Transaction Sent

Amount: 0.1 SOL
From: Ay2VRpY...WkSna
To: Ay2VRpY...WkSna
Signature: 2GvgQi9N...

[View on Solscan]
```

---

## Alert Types

### 🚨 Large Transaction

Triggered when a transaction exceeds the threshold (default: 10 SOL).

**Example Alert:**
```
🚨 Large Transaction Detected

Wallet: 🐳 whale
Amount: 24.4100 SOL
Status: ✅ Success
Time: 1/20/2026, 10:30:15 AM

[View on Solscan]
```

### 💰 Incoming Transaction

Triggered when a wallet receives SOL.

**Example Alert:**
```
💰 Incoming Transaction

Wallet: 🐳 whale
Amount: 5.2500 SOL
Status: ✅ Success
Time: 1/20/2026, 11:15:42 AM

[View on Solscan]
```

### 📤 Outgoing Transaction

Triggered when a wallet sends SOL.

**Example Alert:**
```
📤 Outgoing Transaction

Wallet: 🐳 whale
Amount: 2.1000 SOL
Status: ✅ Success
Time: 1/20/2026, 11:45:23 AM

[View on Solscan]
```

### 🪙 Token Transfer

Triggered when SPL tokens are transferred.

**Example Alert:**
```
🪙 Token Transfer

Wallet: 🐳 whale
Amount: N/A
Status: ✅ Success
Time: 1/20/2026, 12:10:05 PM

[View on Solscan]
```

### 📊 Balance Change

Triggered when wallet balance changes (any amount).

**Example Alert:**
```
📊 Balance Change

Wallet: 🐳 whale
Amount: 0.5000 SOL
Status: ✅ Success
Time: 1/20/2026, 12:30:18 PM

[View on Solscan]
```

### 🔔 New Transaction

General alert for any new transaction.

**Example Alert:**
```
🔔 New Transaction

Wallet: 🐳 whale
Amount: 1.2345 SOL
Status: ✅ Success
Time: 1/20/2026, 1:00:00 PM

[View on Solscan]
```

---

## Customization

### Disable Specific Alert Types

Edit `telegram-bot.js` and comment out unwanted event listeners:

```javascript
// ===== MONITOR EVENT LISTENERS =====

monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
  await sendAlert(alert, AlertType.LARGE_TRANSACTION);
});

// Disable incoming transaction alerts
// monitor.on(AlertType.TRANSACTION_RECEIVED, async (alert) => {
//   await sendAlert(alert, AlertType.TRANSACTION_RECEIVED);
// });

// Keep outgoing transaction alerts
monitor.on(AlertType.TRANSACTION_SENT, async (alert) => {
  await sendAlert(alert, AlertType.TRANSACTION_SENT);
});
```

### Change Alert Formatting

Modify the `formatAlert()` function in `telegram-bot.js`:

```javascript
function formatAlert(alert, alertType) {
  // ... existing code ...

  // Add custom fields
  const message = `
${emoji} *${title}*

*Wallet:* ${wallet.emoji} ${wallet.name}
*Address:* \`${wallet.address.slice(0, 8)}...\`
*Amount:* ${amount}
*Status:* ${transaction.success ? '✅ Success' : '❌ Failed'}
*Fee:* ${transaction.fee || 'N/A'} SOL
*Time:* ${new Date(timestamp).toLocaleString()}

[View on Solscan](https://solscan.io/tx/${transaction.signature})
[View on Solana Explorer](https://explorer.solana.com/tx/${transaction.signature})
  `.trim();

  return message;
}
```

### Add Custom Commands

Add new command handlers:

```javascript
bot.onText(/\/balance (.+)/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return;

  const walletName = match[1];
  const chatId = msg.chat.id;

  try {
    const summary = await tracker.getWalletSummary(walletName);
    bot.sendMessage(chatId, summary);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Wallet '${walletName}' not found`);
  }
});
```

### Filter Alerts by Amount

Only send alerts for transactions above a certain amount:

```javascript
async function sendAlert(alert, alertType) {
  // Filter: only send if transaction is >= 1 SOL
  if (alert.transaction.amount && alert.transaction.amount < 1) {
    console.log(`⏭️  Skipping alert: amount too small (${alert.transaction.amount} SOL)`);
    return;
  }

  // ... rest of sendAlert function ...
}
```

---

## Troubleshooting

### Bot Not Starting

**Error: `TELEGRAM_BOT_TOKEN not set`**

Solution: Check your `.env` file has the token:
```bash
cat .env | grep TELEGRAM_BOT_TOKEN
```

If missing, add it:
```bash
echo "TELEGRAM_BOT_TOKEN=your_token_here" >> .env
```

**Error: `Error: 401 Unauthorized`**

Solution: Your bot token is invalid. Get a new one from @BotFather:
1. Send `/mybots` to @BotFather
2. Select your bot
3. Choose "API Token"
4. Copy the new token to `.env`

### Not Receiving Alerts

**Problem: Bot runs but no alerts appear**

Solutions:
1. Check you've sent `/start` to the bot
2. Verify `TELEGRAM_CHAT_ID` is set in `.env`
3. Check bot console for errors:
   ```
   ✅ Alert sent: LARGE_TRANSACTION for whale
   ```
4. Ensure wallets are active (check with `/wallets`)

**Problem: Some alerts missing**

Solution: Check if those alert types are enabled in `telegram-bot.js`:
```javascript
monitor.on(AlertType.TRANSACTION_RECEIVED, async (alert) => {
  await sendAlert(alert, AlertType.TRANSACTION_RECEIVED);
});
```

### Unauthorized Access Errors

**Error: `⛔ Unauthorized Access`**

Solution: Your Telegram user ID doesn't match `TELEGRAM_OWNER_ID`:
1. Get your correct user ID from @userinfobot
2. Update `.env`:
   ```bash
   TELEGRAM_OWNER_ID=your_correct_id
   ```
3. Restart the bot

### Polling Errors

**Error: `polling_error: EFATAL`**

Solutions:
1. Check internet connection
2. Verify bot token is correct
3. Restart the bot:
   ```bash
   # Stop with Ctrl+C, then:
   npm run telegram-bot
   ```

### Rate Limiting

**Error: `429 Too Many Requests`**

Solution: Increase `pollInterval` in `telegram-bot.js`:
```javascript
const monitor = new WalletMonitor(tracker, {
  pollInterval: 30000,  // Increase to 30 seconds
  largeTransactionThreshold: 10
});
```

### Memory Issues (Long Running)

**Problem: Bot crashes after hours/days**

Solution: Run in a process manager like `tmux` or `pm2`:

**Using tmux:**
```bash
# Start new session
tmux new -s telegram-bot

# Run bot
npm run telegram-bot

# Detach: Press Ctrl+B, then D

# Reattach later
tmux attach -t telegram-bot
```

**Using PM2:**
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start telegram-bot.js --name laxmi-bot

# View logs
pm2 logs laxmi-bot

# Stop bot
pm2 stop laxmi-bot
```

---

## Security

### Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Set TELEGRAM_OWNER_ID**
   - Prevents unauthorized access
   - Only your Telegram user ID can use the bot

3. **Use a strong bot token**
   - Provided by BotFather (cryptographically secure)
   - If leaked, use `/revoke` in @BotFather

4. **Monitor bot activity**
   - Check console logs regularly
   - Look for unauthorized access attempts:
     ```
     ⛔ Unauthorized access attempt from user 987654321 (@hacker)
     ```

5. **Run on secure server**
   - Use SSH keys, not passwords
   - Keep server OS updated
   - Use firewall (UFW, iptables)

### Owner Verification

The bot checks every message against `TELEGRAM_OWNER_ID`:

```javascript
function isOwner(userId) {
  if (!OWNER_ID) return true; // ⚠️  Insecure if OWNER_ID not set
  return userId.toString() === OWNER_ID;
}
```

**If OWNER_ID is not set:** Anyone can use your bot! Always set it.

### Restricting Commands

All commands are already protected by the `isOwner()` check:

```javascript
bot.onText(/\/status/, async (msg) => {
  if (!isOwner(msg.from.id)) return;  // ✅ Protected
  // ... command logic ...
});
```

### Revoking Bot Access

If your bot token is compromised:

1. Open @BotFather on Telegram
2. Send `/mybots`
3. Select your bot
4. Choose "API Token"
5. Click "Revoke current token"
6. Copy new token to `.env`
7. Restart bot

---

## Advanced Usage

### Running in Background

**Using nohup:**
```bash
nohup npm run telegram-bot > telegram-bot.log 2>&1 &
echo $! > telegram-bot.pid
```

**Stopping:**
```bash
kill $(cat telegram-bot.pid)
```

**Viewing logs:**
```bash
tail -f telegram-bot.log
```

### Auto-Restart on Crash

Use PM2 for automatic restarts:

```bash
pm2 start telegram-bot.js --name laxmi-bot --restart-delay=3000
pm2 save
pm2 startup  # Run command it outputs to enable on boot
```

### Multiple Bots

Run different bots for different wallet groups:

1. Create separate config files:
   ```bash
   cp .env .env.whales
   cp .env .env.personal
   ```

2. Edit each with different `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

3. Create separate bot scripts:
   ```bash
   cp telegram-bot.js telegram-bot-whales.js
   cp telegram-bot.js telegram-bot-personal.js
   ```

4. Modify each to load different wallets

5. Run both:
   ```bash
   ENV_FILE=.env.whales node telegram-bot-whales.js &
   ENV_FILE=.env.personal node telegram-bot-personal.js &
   ```

---

## Resources

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **BotFather Guide**: https://core.telegram.org/bots#6-botfather
- **node-telegram-bot-api**: https://github.com/yagop/node-telegram-bot-api
- **Laxmi Tracker Docs**: See [CLAUDE.md](./CLAUDE.md) for AI agent integration

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review console logs for errors
3. Verify `.env` configuration
4. Test with `/start` command
5. Open an issue on GitHub (if applicable)

---

## License

MIT License - see main project README
