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

  /**
   * Get detailed transaction information
   */
  async getTransactionDetails(signature) {
    const tx = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    const details = {
      signature,
      blockTime: tx.blockTime,
      slot: tx.slot,
      fee: tx.meta.fee / LAMPORTS_PER_SOL,
      success: tx.meta.err === null,
      error: tx.meta.err
    };

    // Try to extract balance changes (SOL transfers)
    try {
      const balanceChanges = this._extractBalanceChanges(tx);
      details.balanceChanges = balanceChanges;
    } catch (error) {
      details.balanceChanges = {};
      details.parseWarning = `Could not extract balance changes: ${error.message}`;
    }

    // Extract token transfers
    try {
      const tokenTransfers = this._extractTokenTransfers(tx);
      details.tokenTransfers = tokenTransfers;
    } catch (error) {
      details.tokenTransfers = [];
    }

    // Add pre/post balances
    try {
      details.accountBalances = this._extractAccountBalances(tx);
    } catch (error) {
      details.accountBalances = [];
    }

    return details;
  }

  /**
   * Extract SOL balance changes from transaction
   */
  _extractBalanceChanges(tx) {
    const changes = {};

    // Handle both versioned and legacy transactions
    let accountKeys;
    if (tx.transaction.message.getAccountKeys) {
      // Versioned transaction
      accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
    } else if (tx.transaction.message.accountKeys) {
      // Legacy transaction
      accountKeys = tx.transaction.message.accountKeys;
    } else {
      return changes;
    }

    tx.meta.preBalances.forEach((preBalance, index) => {
      const postBalance = tx.meta.postBalances[index];
      const change = (postBalance - preBalance) / LAMPORTS_PER_SOL;

      if (change !== 0 && accountKeys[index]) {
        const address = accountKeys[index].toString();
        changes[address] = change;
      }
    });

    return changes;
  }

  /**
   * Extract token transfers from transaction
   */
  _extractTokenTransfers(tx) {
    const transfers = [];

    if (!tx.meta.preTokenBalances || !tx.meta.postTokenBalances) {
      return transfers;
    }

    // Group by account index
    const tokenBalances = {};

    tx.meta.preTokenBalances.forEach(pre => {
      if (!tokenBalances[pre.accountIndex]) {
        tokenBalances[pre.accountIndex] = {};
      }
      tokenBalances[pre.accountIndex].pre = pre;
    });

    tx.meta.postTokenBalances.forEach(post => {
      if (!tokenBalances[post.accountIndex]) {
        tokenBalances[post.accountIndex] = {};
      }
      tokenBalances[post.accountIndex].post = post;
    });

    // Calculate changes
    Object.entries(tokenBalances).forEach(([accountIndex, balances]) => {
      if (balances.pre && balances.post) {
        const preAmount = parseFloat(balances.pre.uiTokenAmount.uiAmountString || '0');
        const postAmount = parseFloat(balances.post.uiTokenAmount.uiAmountString || '0');
        const change = postAmount - preAmount;

        if (change !== 0) {
          transfers.push({
            accountIndex: parseInt(accountIndex),
            mint: balances.post.mint,
            amount: change,
            decimals: balances.post.uiTokenAmount.decimals,
            owner: balances.post.owner
          });
        }
      }
    });

    return transfers;
  }

  /**
   * Extract account balances before/after transaction
   */
  _extractAccountBalances(tx) {
    const balances = [];

    // Handle both versioned and legacy transactions
    let accountKeys;
    if (tx.transaction.message.getAccountKeys) {
      // Versioned transaction
      accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;
    } else if (tx.transaction.message.accountKeys) {
      // Legacy transaction
      accountKeys = tx.transaction.message.accountKeys;
    } else {
      return balances;
    }

    accountKeys.forEach((account, index) => {
      if (tx.meta.preBalances[index] !== undefined && tx.meta.postBalances[index] !== undefined) {
        balances.push({
          address: account.toString(),
          preBalance: tx.meta.preBalances[index] / LAMPORTS_PER_SOL,
          postBalance: tx.meta.postBalances[index] / LAMPORTS_PER_SOL,
          change: (tx.meta.postBalances[index] - tx.meta.preBalances[index]) / LAMPORTS_PER_SOL
        });
      }
    });

    return balances;
  }

  /**
   * Get detailed transaction history with amounts
   */
  async getDetailedTransactionHistory(nameOrAddress, limit = 5) {
    let wallet = this.getWalletByName(nameOrAddress);
    let address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const signatures = await this.getRecentTransactions(address, limit);

    const detailedTxs = [];
    for (const sig of signatures) {
      try {
        const details = await this.getTransactionDetails(sig.signature);
        detailedTxs.push({
          ...details,
          timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null
        });
      } catch (error) {
        detailedTxs.push({
          signature: sig.signature,
          error: error.message
        });
      }
    }

    return {
      address,
      name: wallet?.name || 'Unknown',
      emoji: wallet?.emoji || '💼',
      transactions: detailedTxs
    };
  }

  /**
   * Get LLM-friendly transaction summary
   */
  async getTransactionSummary(signature) {
    const details = await this.getTransactionDetails(signature);

    let summary = `Transaction: ${signature.substring(0, 20)}...\n`;
    summary += `Status: ${details.success ? '✅ Success' : '❌ Failed'}\n`;
    summary += `Fee: ${details.fee.toFixed(6)} SOL\n`;

    if (Object.keys(details.balanceChanges).length > 0) {
      summary += '\nSOL Changes:\n';
      Object.entries(details.balanceChanges).forEach(([addr, change]) => {
        const sign = change > 0 ? '+' : '';
        summary += `  ${addr.substring(0, 10)}... ${sign}${change.toFixed(4)} SOL\n`;
      });
    }

    if (details.tokenTransfers.length > 0) {
      summary += '\nToken Transfers:\n';
      details.tokenTransfers.forEach(transfer => {
        const sign = transfer.amount > 0 ? '+' : '';
        summary += `  ${transfer.mint.substring(0, 10)}... ${sign}${transfer.amount}\n`;
      });
    }

    return summary;
  }
}

export default WalletTracker;
