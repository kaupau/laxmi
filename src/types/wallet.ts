/**
 * Wallet management type definitions
 */

import { Keypair } from '@solana/web3.js';

/**
 * Wallet creation result
 */
export interface WalletCreationResult {
  publicKey: string;
  secretKey: string;
  keypair: Keypair;
}

/**
 * Wallet load result
 */
export interface WalletLoadResult {
  publicKey: string;
  loaded: boolean;
}

/**
 * Wallet file data structure
 */
export interface WalletFileData {
  publicKey: string;
  secretKey: string;
}

/**
 * Transaction send options
 */
export interface SendOptions {
  commitment?: 'processed' | 'confirmed' | 'finalized';
  skipPreflight?: boolean;
  maxRetries?: number;
}

/**
 * Send SOL result
 */
export interface SendSolResult {
  signature: string;
  amount: number;
  from: string;
  to: string;
  success: boolean;
}
