#!/bin/bash

# Laxmi Trading Bot Manager
# Manage the trading bot tmux session

SESSION_NAME="laxmi-bot"

case "$1" in
  start)
    # Check if session already exists
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
      echo "❌ Bot is already running!"
      echo "💡 Use: ./bot-manager.sh status"
      echo "💡 Or attach: ./bot-manager.sh attach"
      exit 1
    fi

    echo "🚀 Starting Laxmi Trading Bot..."
    echo ""

    # Create new tmux session and run bot
    tmux new-session -d -s $SESSION_NAME "./start-bot.sh"

    sleep 2

    echo "✅ Bot started in background!"
    echo ""
    echo "📋 Management Commands:"
    echo "   ./bot-manager.sh status   - Check if bot is running"
    echo "   ./bot-manager.sh attach   - View bot in real-time"
    echo "   ./bot-manager.sh logs     - Show recent activity"
    echo "   ./bot-manager.sh stop     - Stop the bot"
    echo ""
    echo "💡 The bot is running in tmux session: $SESSION_NAME"
    echo "💡 It will keep running even if you disconnect"
    ;;

  stop)
    if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
      echo "❌ Bot is not running"
      exit 1
    fi

    echo "🛑 Stopping bot..."
    tmux send-keys -t $SESSION_NAME C-c
    sleep 2
    tmux kill-session -t $SESSION_NAME 2>/dev/null
    echo "✅ Bot stopped"
    ;;

  status)
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
      echo "✅ Bot is RUNNING"
      echo ""
      echo "Session: $SESSION_NAME"
      echo "Started: $(tmux display-message -t $SESSION_NAME -p '#{session_created}')"
      echo ""
      echo "💡 Attach to view: ./bot-manager.sh attach"
    else
      echo "❌ Bot is NOT running"
      echo ""
      echo "💡 Start with: ./bot-manager.sh start"
    fi
    ;;

  attach)
    if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
      echo "❌ Bot is not running"
      echo "💡 Start with: ./bot-manager.sh start"
      exit 1
    fi

    echo "📺 Attaching to bot session..."
    echo "💡 Press Ctrl+B then D to detach (bot keeps running)"
    echo ""
    sleep 2
    tmux attach-session -t $SESSION_NAME
    ;;

  logs)
    if ! tmux has-session -t $SESSION_NAME 2>/dev/null; then
      echo "❌ Bot is not running"
      exit 1
    fi

    echo "📜 Recent bot activity:"
    echo "═══════════════════════════════════════════════════════════"
    tmux capture-pane -t $SESSION_NAME -p -S -50
    ;;

  restart)
    echo "🔄 Restarting bot..."
    $0 stop
    sleep 2
    $0 start
    ;;

  *)
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║        Laxmi Trading Bot Manager                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: ./bot-manager.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the bot in background"
    echo "  stop     - Stop the bot"
    echo "  status   - Check if bot is running"
    echo "  attach   - Attach to bot session (view real-time)"
    echo "  logs     - Show recent activity"
    echo "  restart  - Restart the bot"
    echo ""
    echo "Examples:"
    echo "  ./bot-manager.sh start    # Start bot"
    echo "  ./bot-manager.sh status   # Check status"
    echo "  ./bot-manager.sh attach   # View live"
    echo "  ./bot-manager.sh stop     # Stop bot"
    echo ""
    exit 1
    ;;
esac
