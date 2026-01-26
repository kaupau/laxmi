/**
 * Alert system type definitions
 */

import type { TokenTransfer, BalanceChange } from './common.js';

/**
 * Alert types enumeration
 */
export enum AlertType {
  TRANSACTION_RECEIVED = 'TRANSACTION_RECEIVED',
  TRANSACTION_SENT = 'TRANSACTION_SENT',
  BALANCE_CHANGE = 'BALANCE_CHANGE',
  TOKEN_TRANSFER = 'TOKEN_TRANSFER',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  NEW_TRANSACTION = 'NEW_TRANSACTION',
}

/**
 * Wallet information in alerts
 */
export interface AlertWallet {
  address: string;
  name: string;
  emoji: string;
  trackedWalletAddress?: string;
}

/**
 * Transaction information in alerts
 */
export interface AlertTransaction {
  signature: string;
  slot: number;
  success: boolean;
  fee: number;
  balanceChanges: BalanceChange;
  tokenTransfers: TokenTransfer[];
  amount?: number;
}

/**
 * Balance change information in alerts
 */
export interface AlertBalance {
  old: number;
  new: number;
  change: number;
}

/**
 * Base alert structure
 */
export interface BaseAlert {
  type: AlertType;
  timestamp: string;
  wallet: AlertWallet;
}

/**
 * Transaction alert (most common type)
 */
export interface TransactionAlert extends BaseAlert {
  transaction: AlertTransaction;
  thesis?: ThesisResult;
  analysis?: any; // TokenAnalysis, avoiding circular dependency
}

/**
 * Balance change alert
 */
export interface BalanceChangeAlert extends BaseAlert {
  balance: AlertBalance;
}

/**
 * Union type for all alerts
 */
export type Alert = TransactionAlert | BalanceChangeAlert;

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: AlertType[];
  wallets: string[] | 'all';
  filters: {
    minAmount?: number;
  };
  headers: Record<string, string>;
}

/**
 * Monitor options
 */
export interface MonitorOptions {
  pollInterval?: number;
  largeTransactionThreshold?: number;
}

/**
 * Monitor statistics
 */
export interface MonitorStats {
  isMonitoring: boolean;
  walletsMonitored: number;
  pollInterval: number;
  webhooksRegistered: number;
  lastChecked: Record<string, string>;
  currentBalances: Record<string, number>;
}

/**
 * Thesis result (from trade-thesis-agent)
 */
export interface ThesisResult {
  thesis: string;
  recommendation: 'BUY' | 'WATCH' | 'SKIP';
  score: number;
  aiGenerated: boolean;
}
