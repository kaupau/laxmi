import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as bs58 from 'bs58';

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
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallet = null;
  }

  /**
   * Create a new wallet
   */
  createWallet() {
    const keypair = Keypair.generate();
    this.wallet = keypair;

    return {
      publicKey: keypair.publicKey.toString(),
      secretKey: bs58.encode(keypair.secretKey),
      keypair: keypair
    };
  }

  /**
   * Load wallet from private key (base58 encoded)
   */
  loadWallet(privateKeyBase58) {
    try {
      const secretKey = bs58.decode(privateKeyBase58);
      const keypair = Keypair.fromSecretKey(secretKey);
      this.wallet = keypair;

      return {
        publicKey: keypair.publicKey.toString(),
        loaded: true
      };
    } catch (error) {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  /**
   * Load wallet from secret key array [1,2,3,...]
   */
  loadWalletFromArray(secretKeyArray) {
    try {
      const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
      this.wallet = keypair;

      return {
        publicKey: keypair.publicKey.toString(),
        loaded: true
      };
    } catch (error) {
      throw new Error(`Failed to load wallet from array: ${error.message}`);
    }
  }

  /**
   * Save wallet to file (ENCRYPTED recommended in production!)
   */
  saveWallet(filePath, encrypt = false) {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const data = {
      publicKey: this.wallet.publicKey.toString(),
      secretKey: bs58.encode(this.wallet.secretKey)
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
   */
  loadWalletFromFile(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`Wallet file not found: ${filePath}`);
    }

    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return this.loadWallet(data.secretKey);
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get wallet public key
   */
  getPublicKey() {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    return this.wallet.publicKey.toString();
  }

  /**
   * Send SOL to another wallet
   */
  async sendSol(toAddress, amount, options = {}) {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const toPubkey = new PublicKey(toAddress);
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: toPubkey,
        lamports: lamports
      })
    );

    console.log(`Sending ${amount} SOL to ${toAddress}...`);

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        {
          commitment: 'confirmed',
          ...options
        }
      );

      console.log(`✅ Transaction confirmed: ${signature}`);

      return {
        signature,
        amount,
        from: this.wallet.publicKey.toString(),
        to: toAddress,
        success: true
      };
    } catch (error) {
      console.error(`❌ Transaction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Airdrop SOL (devnet/testnet only)
   */
  async airdrop(amount = 1) {
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
      console.error(`❌ Airdrop failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent transactions for this wallet
   */
  async getRecentTransactions(limit = 10) {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const signatures = await this.connection.getSignaturesForAddress(
      this.wallet.publicKey,
      { limit }
    );

    return signatures;
  }

  /**
   * Check if wallet has minimum balance
   */
  async hasMinimumBalance(minAmount) {
    const balance = await this.getBalance();
    return balance >= minAmount;
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(transaction) {
    const { feeCalculator } = await this.connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
  }
}

export default WalletManager;
