/**
 * Common type definitions shared across the application
 */

/**
 * Wallet configuration from wallets.json
 */
export interface WalletConfig {
  name: string;
  emoji: string;
  trackedWalletAddress: string;
  alertsOnFeed?: boolean;
}

/**
 * Wallet information with balance
 */
export interface WalletInfo {
  address: string;
  name: string;
  emoji: string;
  balance: number;
  balanceFormatted: string;
  metadata: WalletConfig | null;
  error?: string;
}

/**
 * Transaction signature info from Solana
 */
export interface TransactionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown | null;
}

/**
 * Balance change in a transaction
 */
export interface BalanceChange {
  [address: string]: number;
}

/**
 * Token transfer information
 */
export interface TokenTransfer {
  accountIndex: number;
  mint: string;
  amount: number;
  decimals: number;
  owner: string;
  symbol?: string;
}

/**
 * Account balance before/after transaction
 */
export interface AccountBalance {
  address: string;
  preBalance: number;
  postBalance: number;
  change: number;
}

/**
 * Detailed transaction information
 */
export interface TransactionDetails {
  signature: string;
  blockTime: number | null;
  slot: number;
  fee: number;
  success: boolean;
  error: unknown | null;
  balanceChanges: BalanceChange;
  tokenTransfers: TokenTransfer[];
  accountBalances: AccountBalance[];
  parseWarning?: string;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
