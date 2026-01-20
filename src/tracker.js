import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WalletTracker - A simple utility to track Solana wallet balances and transactions
 */
export class WalletTracker {
  constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallets = [];
  }

  /**
   * Load wallets from configuration file
   */
  loadWallets(configPath = join(__dirname, '../wallets.json')) {
    const data = readFileSync(configPath, 'utf-8');
    this.wallets = JSON.parse(data);
    return this.wallets;
  }

  /**
   * Get wallet by name
   */
  getWalletByName(name) {
    return this.wallets.find(w => w.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get SOL balance for a wallet address
   */
  async getBalance(address) {
    const publicKey = new PublicKey(address);
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get recent transaction signatures for a wallet
   */
  async getRecentTransactions(address, limit = 10) {
    const publicKey = new PublicKey(address);
    const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
    return signatures;
  }

  /**
   * Get wallet info (balance + metadata)
   */
  async getWalletInfo(nameOrAddress) {
    // Try to find by name first
    let wallet = this.getWalletByName(nameOrAddress);

    // If not found by name, try to find by address
    if (!wallet) {
      wallet = this.wallets.find(w => w.trackedWalletAddress === nameOrAddress);
    }

    let address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const balance = await this.getBalance(address);

    return {
      address,
      name: wallet?.name || 'Unknown',
      emoji: wallet?.emoji || '💼',
      balance: balance,
      balanceFormatted: `${balance.toFixed(4)} SOL`,
      metadata: wallet || null
    };
  }

  /**
   * Get info for all tracked wallets
   */
  async getAllWalletsInfo() {
    const results = [];
    for (const wallet of this.wallets) {
      try {
        const info = await this.getWalletInfo(wallet.trackedWalletAddress);
        results.push(info);
      } catch (error) {
        results.push({
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji,
          error: error.message
        });
      }
    }
    return results;
  }

  /**
   * Get LLM-friendly summary of wallet
   */
  async getWalletSummary(nameOrAddress) {
    const info = await this.getWalletInfo(nameOrAddress);
    return `${info.emoji} ${info.name}: ${info.balanceFormatted} (${info.address})`;
  }

  /**
   * Get LLM-friendly summary of all wallets
   */
  async getAllWalletsSummary() {
    const infos = await this.getAllWalletsInfo();
    let summary = '📊 Wallet Tracker Summary\n\n';

    for (const info of infos) {
      if (info.error) {
        summary += `${info.emoji} ${info.name}: ERROR - ${info.error}\n`;
      } else {
        summary += `${info.emoji} ${info.name}: ${info.balanceFormatted}\n`;
      }
    }

    const totalBalance = infos
      .filter(i => !i.error)
      .reduce((sum, i) => sum + i.balance, 0);

    summary += `\n💰 Total Balance: ${totalBalance.toFixed(4)} SOL`;

    return summary;
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(nameOrAddress, limit = 5) {
    let wallet = this.getWalletByName(nameOrAddress);
    let address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const transactions = await this.getRecentTransactions(address, limit);

    return {
      address,
      name: wallet?.name || 'Unknown',
      emoji: wallet?.emoji || '💼',
      transactions: transactions.map(tx => ({
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        error: tx.err
      }))
    };
  }
}

export default WalletTracker;
