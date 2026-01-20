import { WalletTracker } from '../src/tracker.js';
import { WalletMonitor, AlertType } from '../src/alerts.js';

/**
 * Example: Webhook integration
 *
 * This example shows how to integrate webhooks for external notifications.
 * Replace the webhook URLs with your actual Discord/Slack/Telegram webhooks.
 */
async function main() {
  console.log('🔗 Webhook Integration Example\n');

  const tracker = new WalletTracker();
  tracker.loadWallets();

  const monitor = new WalletMonitor(tracker, {
    pollInterval: 10000,
    largeTransactionThreshold: 10
  });

  // Example 1: Discord Webhook
  // Get your webhook URL from Discord Server Settings > Integrations > Webhooks
  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL';

  if (DISCORD_WEBHOOK !== 'YOUR_DISCORD_WEBHOOK_URL') {
    monitor.registerWebhook({
      url: DISCORD_WEBHOOK,
      events: [AlertType.LARGE_TRANSACTION, AlertType.TOKEN_TRANSFER],
      wallets: ['whale', 'gremlin'],  // Only these wallets
      filters: {
        minAmount: 10  // Only transactions >= 10 SOL
      }
    });
    console.log('✅ Discord webhook registered');
  } else {
    console.log('⚠️  Discord webhook not configured (set DISCORD_WEBHOOK_URL env var)');
  }

  // Example 2: Custom webhook to your server
  const CUSTOM_WEBHOOK = process.env.CUSTOM_WEBHOOK_URL;

  if (CUSTOM_WEBHOOK) {
    monitor.registerWebhook({
      url: CUSTOM_WEBHOOK,
      events: Object.values(AlertType),  // All event types
      wallets: 'all',  // All wallets
      headers: {
        'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || 'your-secret-token'}`,
        'X-Custom-Header': 'laxmi-tracker'
      }
    });
    console.log('✅ Custom webhook registered');
  } else {
    console.log('⚠️  Custom webhook not configured (set CUSTOM_WEBHOOK_URL env var)');
  }

  // Example 3: Format Discord embeds manually
  monitor.on(AlertType.LARGE_TRANSACTION, async (alert) => {
    const embed = {
      embeds: [{
        title: `🚨 Large Transaction Alert`,
        description: `${alert.wallet.emoji} **${alert.wallet.name}** just made a large transaction!`,
        color: 0xff6600,  // Orange
        fields: [
          {
            name: 'Amount',
            value: `${alert.transaction.amount.toFixed(4)} SOL`,
            inline: true
          },
          {
            name: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            inline: true
          },
          {
            name: 'Transaction',
            value: `[View on Solscan](https://solscan.io/tx/${alert.transaction.signature})`,
            inline: false
          },
          {
            name: 'Wallet Address',
            value: `\`${alert.wallet.address}\``,
            inline: false
          }
        ],
        timestamp: alert.timestamp,
        footer: {
          text: 'Laxmi Wallet Tracker'
        }
      }]
    };

    // Send to Discord (if configured)
    if (DISCORD_WEBHOOK !== 'YOUR_DISCORD_WEBHOOK_URL') {
      try {
        await fetch(DISCORD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(embed)
        });
        console.log('📤 Sent Discord notification');
      } catch (error) {
        console.error('Failed to send Discord notification:', error.message);
      }
    }
  });

  // Example 4: Telegram notification
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    monitor.on(AlertType.TRANSACTION_RECEIVED, async (alert) => {
      const message = `
🟢 *Transaction Received*

Wallet: ${alert.wallet.emoji} ${alert.wallet.name}
Amount: ${alert.transaction.amount.toFixed(4)} SOL
Time: ${new Date(alert.timestamp).toLocaleString()}

[View Transaction](https://solscan.io/tx/${alert.transaction.signature})
      `.trim();

      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
          })
        });
        console.log('📤 Sent Telegram notification');
      } catch (error) {
        console.error('Failed to send Telegram notification:', error.message);
      }
    });
    console.log('✅ Telegram notifications enabled');
  } else {
    console.log('⚠️  Telegram not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars)');
  }

  // Example 5: Slack webhook
  const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

  if (SLACK_WEBHOOK) {
    monitor.on(AlertType.TOKEN_TRANSFER, async (alert) => {
      const message = {
        text: `🪙 Token Activity Detected`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🪙 Token Transfer Alert'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Wallet:*\n${alert.wallet.emoji} ${alert.wallet.name}`
              },
              {
                type: 'mrkdwn',
                text: `*Transfers:*\n${alert.transaction.tokenTransfers.length} token(s)`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<https://solscan.io/tx/${alert.transaction.signature}|View Transaction>`
            }
          }
        ]
      };

      try {
        await fetch(SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        console.log('📤 Sent Slack notification');
      } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
      }
    });
    console.log('✅ Slack webhook registered');
  } else {
    console.log('⚠️  Slack webhook not configured (set SLACK_WEBHOOK_URL env var)');
  }

  // Show configuration
  console.log('\n📋 Webhook Configuration:');
  console.log(`   Registered webhooks: ${monitor.webhooks?.length || 0}`);
  console.log('\n💡 To configure webhooks, set these environment variables:');
  console.log('   - DISCORD_WEBHOOK_URL');
  console.log('   - CUSTOM_WEBHOOK_URL');
  console.log('   - WEBHOOK_TOKEN');
  console.log('   - TELEGRAM_BOT_TOKEN');
  console.log('   - TELEGRAM_CHAT_ID');
  console.log('   - SLACK_WEBHOOK_URL');
  console.log('\nExample:');
  console.log('   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nStopping monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  console.log('\n🚀 Starting monitor...');
  console.log('Press Ctrl+C to stop\n');

  await monitor.start();
}

main().catch(console.error);
