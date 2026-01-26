/**
 * Anthropic API type definitions for trade thesis generation
 */

import { TokenAnalysis } from './analysis.js';
import { AlertWallet, AlertTransaction } from './alerts.js';

/**
 * Thesis generation input
 */
export interface ThesisInput {
  tokenAnalysis: TokenAnalysis;
  walletInfo: AlertWallet;
  transactionDetails: AlertTransaction;
}

/**
 * Thesis result
 */
export interface ThesisResult {
  thesis: string;
  recommendation: 'BUY' | 'WATCH' | 'SKIP';
  score: number;
  aiGenerated: boolean;
}
