import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type {
  WalletConfig,
  WalletInfo,
  TransactionSignature,
  TransactionDetails,
  BalanceChange,
  TokenTransfer,
  AccountBalance,
} from './types/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WalletTracker - A simple utility to track Solana wallet balances and transactions
 */
export class WalletTracker {
  private readonly connection: Connection;
  public wallets: WalletConfig[];

  /**
   * Initialize wallet tracker
   * @param rpcUrl - Solana RPC endpoint URL
   */
  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.wallets = [];
  }

  /**
   * Load wallets from configuration file
   * @param configPath - Path to wallets.json config file
   */
  public loadWallets(configPath: string = join(__dirname, '../wallets.json')): WalletConfig[] {
    const data = readFileSync(configPath, 'utf-8');
    this.wallets = JSON.parse(data) as WalletConfig[];
    return this.wallets;
  }

  /**
   * Get wallet by name
   * @param name - Wallet name (case-insensitive)
   */
  public getWalletByName(name: string): WalletConfig | undefined {
    return this.wallets.find((w) => w.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get SOL balance for a wallet address
   * @param address - Wallet address
   */
  public async getBalance(address: string): Promise<number> {
    const publicKey = new PublicKey(address);
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get recent transaction signatures for a wallet
   * @param address - Wallet address
   * @param limit - Maximum number of transactions
   */
  public async getRecentTransactions(
    address: string,
    limit: number = 10
  ): Promise<TransactionSignature[]> {
    const publicKey = new PublicKey(address);
    const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });

    // Map to our TransactionSignature type
    return signatures.map(sig => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      err: sig.err,
    }));
  }

  /**
   * Get wallet info (balance + metadata)
   * @param nameOrAddress - Wallet name or address
   */
  public async getWalletInfo(nameOrAddress: string): Promise<WalletInfo> {
    // Try to find by name first
    let wallet = this.getWalletByName(nameOrAddress);

    // If not found by name, try to find by address
    if (!wallet) {
      wallet = this.wallets.find((w) => w.trackedWalletAddress === nameOrAddress);
    }

    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    try {
      const balance = await this.getBalance(address);

      return {
        address,
        name: wallet?.name ?? 'Unknown',
        emoji: wallet?.emoji ?? '💼',
        balance: balance,
        balanceFormatted: `${balance.toFixed(4)} SOL`,
        metadata: wallet ?? null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        address,
        name: wallet?.name ?? 'Unknown',
        emoji: wallet?.emoji ?? '💼',
        balance: 0,
        balanceFormatted: '0.0000 SOL',
        metadata: wallet ?? null,
        error: errorMessage,
      };
    }
  }

  /**
   * Get info for all tracked wallets
   */
  public async getAllWalletsInfo(): Promise<WalletInfo[]> {
    const results: WalletInfo[] = [];
    for (const wallet of this.wallets) {
      try {
        const info = await this.getWalletInfo(wallet.trackedWalletAddress);
        results.push(info);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          address: wallet.trackedWalletAddress,
          name: wallet.name,
          emoji: wallet.emoji,
          balance: 0,
          balanceFormatted: '0.0000 SOL',
          metadata: wallet,
          error: errorMessage,
        });
      }
    }
    return results;
  }

  /**
   * Get LLM-friendly summary of wallet
   * @param nameOrAddress - Wallet name or address
   */
  public async getWalletSummary(nameOrAddress: string): Promise<string> {
    const info = await this.getWalletInfo(nameOrAddress);
    return `${info.emoji} ${info.name}: ${info.balanceFormatted} (${info.address})`;
  }

  /**
   * Get LLM-friendly summary of all wallets
   */
  public async getAllWalletsSummary(): Promise<string> {
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
      .filter((i) => !i.error)
      .reduce((sum, i) => sum + i.balance, 0);

    summary += `\n💰 Total Balance: ${totalBalance.toFixed(4)} SOL`;

    return summary;
  }

  /**
   * Get transaction history for a wallet
   * @param nameOrAddress - Wallet name or address
   * @param limit - Maximum number of transactions
   */
  public async getTransactionHistory(
    nameOrAddress: string,
    limit: number = 5
  ): Promise<{
    address: string;
    name: string;
    emoji: string;
    transactions: Array<{
      signature: string;
      slot: number;
      timestamp: string | null;
      error: unknown | null;
    }>;
  }> {
    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const transactions = await this.getRecentTransactions(address, limit);

    return {
      address,
      name: wallet?.name ?? 'Unknown',
      emoji: wallet?.emoji ?? '💼',
      transactions: transactions.map((tx) => ({
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        error: tx.err,
      })),
    };
  }

  /**
   * Get detailed transaction information
   * @param signature - Transaction signature
   */
  public async getTransactionDetails(signature: string): Promise<TransactionDetails> {
    const tx = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      throw new Error(`Transaction not found: ${signature}`);
    }

    const details: TransactionDetails = {
      signature,
      blockTime: tx.blockTime ?? null,
      slot: tx.slot,
      fee: tx.meta ? tx.meta.fee / LAMPORTS_PER_SOL : 0,
      success: tx.meta ? tx.meta.err === null : false,
      error: tx.meta?.err ?? null,
      balanceChanges: {},
      tokenTransfers: [],
      accountBalances: [],
    };

    // Try to extract balance changes (SOL transfers)
    try {
      const balanceChanges = this._extractBalanceChanges(tx as unknown as ParsedTransactionWithMeta);
      details.balanceChanges = balanceChanges;
    } catch (error) {
      details.balanceChanges = {};
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      details.parseWarning = `Could not extract balance changes: ${errorMessage}`;
    }

    // Extract token transfers
    try {
      const tokenTransfers = this._extractTokenTransfers(tx as unknown as ParsedTransactionWithMeta);
      details.tokenTransfers = tokenTransfers;
    } catch (error) {
      details.tokenTransfers = [];
    }

    // Add pre/post balances
    try {
      details.accountBalances = this._extractAccountBalances(tx as unknown as ParsedTransactionWithMeta);
    } catch (error) {
      details.accountBalances = [];
    }

    return details;
  }

  /**
   * Extract SOL balance changes from transaction
   */
  private _extractBalanceChanges(tx: ParsedTransactionWithMeta): BalanceChange {
    const changes: BalanceChange = {};

    if (!tx.meta) return changes;

    // Handle both versioned and legacy transactions
    let accountKeys: PublicKey[] = [];
    if (tx.transaction.message && 'accountKeys' in tx.transaction.message) {
      // Parsed transaction
      accountKeys = tx.transaction.message.accountKeys.map((acc: any) => new PublicKey(acc.pubkey));
    } else {
      return changes;
    }

    tx.meta.preBalances.forEach((preBalance, index) => {
      const postBalance = tx.meta?.postBalances[index];
      if (postBalance === undefined) return;

      const change = (postBalance - preBalance) / LAMPORTS_PER_SOL;

      if (change !== 0 && accountKeys[index]) {
        const address = accountKeys[index]!.toString();
        changes[address] = change;
      }
    });

    return changes;
  }

  /**
   * Extract token transfers from transaction
   */
  private _extractTokenTransfers(tx: ParsedTransactionWithMeta): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];

    if (!tx.meta || !tx.meta.preTokenBalances || !tx.meta.postTokenBalances) {
      return transfers;
    }

    // Group by account index
    const tokenBalances: Record<
      number,
      { pre?: typeof tx.meta.preTokenBalances[0]; post?: typeof tx.meta.postTokenBalances[0] }
    > = {};

    tx.meta.preTokenBalances.forEach((pre) => {
      if (!tokenBalances[pre.accountIndex]) {
        tokenBalances[pre.accountIndex] = {};
      }
      tokenBalances[pre.accountIndex]!.pre = pre;
    });

    tx.meta.postTokenBalances.forEach((post) => {
      if (!tokenBalances[post.accountIndex]) {
        tokenBalances[post.accountIndex] = {};
      }
      tokenBalances[post.accountIndex]!.post = post;
    });

    // Calculate changes
    Object.entries(tokenBalances).forEach(([accountIndex, balances]) => {
      if (balances.pre && balances.post) {
        const preAmount = parseFloat(balances.pre.uiTokenAmount.uiAmountString ?? '0');
        const postAmount = parseFloat(balances.post.uiTokenAmount.uiAmountString ?? '0');
        const change = postAmount - preAmount;

        if (change !== 0) {
          transfers.push({
            accountIndex: parseInt(accountIndex),
            mint: balances.post.mint,
            amount: change,
            decimals: balances.post.uiTokenAmount.decimals,
            owner: balances.post.owner ?? '',
          });
        }
      }
    });

    return transfers;
  }

  /**
   * Extract account balances before/after transaction
   */
  private _extractAccountBalances(tx: ParsedTransactionWithMeta): AccountBalance[] {
    const balances: AccountBalance[] = [];

    if (!tx.meta) return balances;

    // Handle both versioned and legacy transactions
    let accountKeys: PublicKey[] = [];
    if (tx.transaction.message && 'accountKeys' in tx.transaction.message) {
      // Parsed transaction
      accountKeys = tx.transaction.message.accountKeys.map((acc: any) => new PublicKey(acc.pubkey));
    } else {
      return balances;
    }

    accountKeys.forEach((account, index) => {
      const preBalance = tx.meta?.preBalances[index];
      const postBalance = tx.meta?.postBalances[index];

      if (preBalance !== undefined && postBalance !== undefined) {
        balances.push({
          address: account.toString(),
          preBalance: preBalance / LAMPORTS_PER_SOL,
          postBalance: postBalance / LAMPORTS_PER_SOL,
          change: (postBalance - preBalance) / LAMPORTS_PER_SOL,
        });
      }
    });

    return balances;
  }

  /**
   * Get detailed transaction history with amounts
   * @param nameOrAddress - Wallet name or address
   * @param limit - Maximum number of transactions
   */
  public async getDetailedTransactionHistory(
    nameOrAddress: string,
    limit: number = 5
  ): Promise<{
    address: string;
    name: string;
    emoji: string;
    transactions: Array<TransactionDetails | { signature: string; error: string }>;
  }> {
    const wallet = this.getWalletByName(nameOrAddress);
    const address = wallet ? wallet.trackedWalletAddress : nameOrAddress;

    const signatures = await this.getRecentTransactions(address, limit);

    const detailedTxs: Array<TransactionDetails | { signature: string; error: string }> = [];
    for (const sig of signatures) {
      try {
        const details = await this.getTransactionDetails(sig.signature);
        detailedTxs.push({
          ...details,
          blockTime: sig.blockTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        detailedTxs.push({
          signature: sig.signature,
          error: errorMessage,
        });
      }
    }

    return {
      address,
      name: wallet?.name ?? 'Unknown',
      emoji: wallet?.emoji ?? '💼',
      transactions: detailedTxs,
    };
  }

  /**
   * Get LLM-friendly transaction summary
   * @param signature - Transaction signature
   */
  public async getTransactionSummary(signature: string): Promise<string> {
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
      details.tokenTransfers.forEach((transfer) => {
        const sign = transfer.amount > 0 ? '+' : '';
        summary += `  ${transfer.mint.substring(0, 10)}... ${sign}${transfer.amount}\n`;
      });
    }

    return summary;
  }
}

export default WalletTracker;
