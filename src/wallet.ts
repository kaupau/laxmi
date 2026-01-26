import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  type ConfirmOptions,
} from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import bs58 from 'bs58';
import type {
  WalletCreationResult,
  WalletLoadResult,
  WalletFileData,
  SendOptions,
  SendSolResult,
} from './types/wallet.js';
import type { TransactionSignature } from './types/common.js';

/**
 * WalletManager - Create and manage Solana wallets for trading
 *
 * SECURITY WARNING:
 * - Never commit private keys to git
 * - Store private keys securely
 * - Use .env files for production
 * - Keep backup of your private keys
 */
export class WalletManager {
  private readonly connection: Connection;
  public wallet: Keypair | null;

  /**
   * Initialize wallet manager
   * @param rpcUrl - Solana RPC endpoint URL
   */
  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallet = null;
  }

  /**
   * Create a new wallet
   */
  public createWallet(): WalletCreationResult {
    const keypair = Keypair.generate();
    this.wallet = keypair;

    return {
      publicKey: keypair.publicKey.toString(),
      secretKey: bs58.encode(keypair.secretKey),
      keypair: keypair,
    };
  }

  /**
   * Load wallet from private key (base58 encoded)
   * @param privateKeyBase58 - Base58 encoded private key
   */
  public loadWallet(privateKeyBase58: string): WalletLoadResult {
    try {
      const secretKey = bs58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);
      this.wallet = keypair;

      return {
        publicKey: keypair.publicKey.toString(),
        loaded: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load wallet: ${errorMessage}`);
    }
  }

  /**
   * Load wallet from secret key array [1,2,3,...]
   * @param secretKeyArray - Array of numbers representing the secret key
   */
  public loadWalletFromArray(secretKeyArray: number[]): WalletLoadResult {
    try {
      const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
      this.wallet = keypair;

      return {
        publicKey: keypair.publicKey.toString(),
        loaded: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load wallet from array: ${errorMessage}`);
    }
  }

  /**
   * Save wallet to file (ENCRYPTED recommended in production!)
   * @param filePath - Path to save wallet file
   * @param encrypt - Whether to encrypt (not implemented, security warning!)
   */
  public saveWallet(filePath: string, encrypt: boolean = false): string {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const data: WalletFileData = {
      publicKey: this.wallet.publicKey.toString(),
      secretKey: bs58.encode(this.wallet.secretKey),
    };

    if (encrypt) {
      // In production, use proper encryption like libsodium
      console.warn('⚠️  Encryption not implemented. Use at your own risk!');
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`⚠️  WARNING: Private key saved to ${filePath}`);
    console.log('🔒 Keep this file secure and never commit it to git!');

    return filePath;
  }

  /**
   * Load wallet from file
   * @param filePath - Path to wallet file
   */
  public loadWalletFromFile(filePath: string): WalletLoadResult {
    if (!existsSync(filePath)) {
      throw new Error(`Wallet file not found: ${filePath}`);
    }

    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as WalletFileData;
    return this.loadWallet(data.secretKey);
  }

  /**
   * Get wallet balance
   */
  public async getBalance(): Promise<number> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get wallet public key
   */
  public getPublicKey(): string {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    return this.wallet.publicKey.toString();
  }

  /**
   * Get wallet keypair (for signing transactions)
   */
  public getKeypair(): Keypair {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    return this.wallet;
  }

  /**
   * Send SOL to another wallet
   * @param toAddress - Recipient wallet address
   * @param amount - Amount in SOL
   * @param options - Transaction options
   */
  public async sendSol(
    toAddress: string,
    amount: number,
    options: SendOptions = {}
  ): Promise<SendSolResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const toPubkey = new PublicKey(toAddress);
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: toPubkey,
        lamports: lamports,
      })
    );

    console.log(`Sending ${amount} SOL to ${toAddress}...`);

    try {
      const confirmOptions: ConfirmOptions = {
        commitment: options.commitment ?? 'confirmed',
        skipPreflight: options.skipPreflight,
        maxRetries: options.maxRetries,
      };

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        confirmOptions
      );

      console.log(`✅ Transaction confirmed: ${signature}`);

      return {
        signature,
        amount,
        from: this.wallet.publicKey.toString(),
        to: toAddress,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Transaction failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Airdrop SOL (devnet/testnet only)
   * @param amount - Amount of SOL to airdrop
   */
  public async airdrop(amount: number = 1): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    console.log(`Requesting ${amount} SOL airdrop...`);

    try {
      const signature = await this.connection.requestAirdrop(
        this.wallet.publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);
      console.log(`✅ Airdrop confirmed: ${signature}`);

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Airdrop failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get recent transactions for this wallet
   * @param limit - Maximum number of transactions to return
   */
  public async getRecentTransactions(limit: number = 10): Promise<TransactionSignature[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const signatures = await this.connection.getSignaturesForAddress(
      this.wallet.publicKey,
      { limit }
    );

    // Map to our TransactionSignature type
    return signatures.map(sig => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      err: sig.err,
    }));
  }

  /**
   * Check if wallet has minimum balance
   * @param minAmount - Minimum amount in SOL
   */
  public async hasMinimumBalance(minAmount: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance >= minAmount;
  }

  /**
   * Estimate transaction fee
   * @param _transaction - Transaction to estimate fee for
   */
  public async estimateFee(_transaction: Transaction): Promise<number> {
    const { feeCalculator } = await this.connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
  }
}

export default WalletManager;
