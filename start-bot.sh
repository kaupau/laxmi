#!/bin/bash

# Laxmi Trading Bot - Background Runner
# This script runs the copy trading bot in dry-run mode

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║         🤖 Laxmi Copy Trading Bot - Starting in Dry-Run         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Starting at: $(date)"
echo "Mode: DRY RUN (simulated trades only)"
echo ""
echo "Bot will:"
echo "  ✓ Monitor tracked wallets"
echo "  ✓ Detect trading opportunities"
echo "  ✓ Simulate trades (no real transactions)"
echo "  ✓ Log all activity"
echo "  ✓ Keep statistics"
echo ""
echo "Press Ctrl+C to stop the bot"
echo "Or detach from tmux with: Ctrl+B then D"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Run the bot
npm run copy-trading
