import { WalletTracker } from './src/tracker.js';

// Initialize tracker
const tracker = new WalletTracker();
tracker.loadWallets();

// LLM Use Case 1: Answer "What's the whale's balance?"
const answer1 = await tracker.getWalletSummary('whale');
console.log(answer1);
// Output: 🐳 whale: 347.5164 SOL (HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp)

// LLM Use Case 2: Answer "Show me all wallet balances"
const answer2 = await tracker.getAllWalletsSummary();
console.log(answer2);
// Output: Formatted summary with all wallets and total

// LLM Use Case 3: Get structured data for analysis
const data = await tracker.getWalletInfo('whale');
console.log(JSON.stringify(data, null, 2));
// Output: {
//   "address": "HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp",
//   "name": "whale",
//   "emoji": "🐳",
//   "balance": 347.5164,
//   "balanceFormatted": "347.5164 SOL",
//   "metadata": {...}
// }
