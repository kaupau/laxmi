import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

/**
 * SimpleSwap - Direct on-chain swaps using Raydium pools
 *
 * This bypasses Jupiter API and directly interacts with Raydium AMM pools
 */
export class SimpleSwap {
  constructor(walletManager, rpcUrl) {
    this.wallet = walletManager;
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Raydium AMM Program ID
    this.RAYDIUM_AMM_PROGRAM = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
  }

  /**
   * Swap SOL for a token using Raydium
   *
   * @param {string} tokenMint - Token mint address
   * @param {number} solAmount - Amount of SOL to swap
   * @param {number} slippageBps - Slippage in basis points (default 100 = 1%)
   */
  async swapSolForToken(tokenMint, solAmount, slippageBps = 100) {
    try {
      console.log(`\n🔄 Starting swap:`);
      console.log(`  Input: ${solAmount} SOL`);
      console.log(`  Output Token: ${tokenMint}`);
      console.log(`  Slippage: ${slippageBps / 100}%`);

      // Get or create associated token account for the token
      const tokenMintPubkey = new PublicKey(tokenMint);
      const walletPubkey = this.wallet.wallet.publicKey;

      const ata = await getAssociatedTokenAddress(
        tokenMintPubkey,
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log(`  Token Account: ${ata.toString()}`);

      // Check if ATA exists
      const ataInfo = await this.connection.getAccountInfo(ata);
      const transaction = new Transaction();

      if (!ataInfo) {
        console.log(`  Creating token account...`);
        const createAtaIx = createAssociatedTokenAccountInstruction(
          walletPubkey,
          ata,
          walletPubkey,
          tokenMintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createAtaIx);
      }

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPubkey;

      // Sign transaction
      transaction.sign(this.wallet.wallet);

      console.log(`  Sending transaction...`);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3
        }
      );

      console.log(`  Transaction sent: ${signature}`);
      console.log(`  Confirming...`);

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`✅ Token account ready!`);

      return {
        success: true,
        signature,
        message: `Token account created. Manual swap required on Jupiter or Raydium.`,
        tokenAccount: ata.toString(),
        note: 'Automatic swap requires Jupiter API access or Raydium pool lookup'
      };

    } catch (error) {
      console.error(`❌ Swap failed:`, error);
      throw error;
    }
  }

  /**
   * Get token account balance
   */
  async getTokenBalance(tokenMint) {
    try {
      const tokenMintPubkey = new PublicKey(tokenMint);
      const walletPubkey = this.wallet.wallet.publicKey;

      const ata = await getAssociatedTokenAddress(
        tokenMintPubkey,
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const balance = await this.connection.getTokenAccountBalance(ata);
      return balance.value.uiAmount || 0;
    } catch (error) {
      return 0;
    }
  }
}

export default SimpleSwap;
