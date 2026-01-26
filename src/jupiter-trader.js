import { Connection, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';

/**
 * JupiterTrader - Execute token swaps using Jupiter DEX aggregator
 *
 * Jupiter API docs: https://station.jup.ag/docs/apis/swap-api
 */
export class JupiterTrader {
  constructor(walletManager, rpcUrl = 'https://api.mainnet-beta.solana.com', apiKey = null) {
    this.wallet = walletManager;
    this.connection = new Connection(rpcUrl, 'confirmed');
    // Public endpoint works without authentication!
    this.jupiterApiUrl = 'https://public.jupiterapi.com';
    this.apiKey = apiKey || process.env.JUPITER_API_KEY;

    console.log('✅ Using Jupiter public API (no auth required)');
  }

  /**
   * Get the best quote for a swap
   */
  async getQuote(inputMint, outputMint, amount, slippageBps = 50) {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString()
      });

      const response = await fetch(`${this.jupiterApiUrl}/quote?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter API error (${response.status}): ${errorText}`);
      }

      const quote = await response.json();

      if (quote.error) {
        throw new Error(`Jupiter quote error: ${quote.error}`);
      }

      return quote;
    } catch (error) {
      throw new Error(`Failed to get Jupiter quote: ${error.message}`);
    }
  }

  /**
   * Execute a swap using Jupiter
   *
   * @param {string} inputMint - Input token mint address (SOL = So11111111111111111111111111111111111111112)
   * @param {string} outputMint - Output token mint address
   * @param {number} amount - Amount in lamports/smallest unit
   * @param {number} slippageBps - Slippage in basis points (50 = 0.5%)
   */
  async swap(inputMint, outputMint, amount, slippageBps = 50) {
    try {
      console.log(`🔄 Getting Jupiter quote for swap...`);
      console.log(`  Input: ${inputMint}`);
      console.log(`  Output: ${outputMint}`);
      console.log(`  Amount: ${amount}`);

      // Get quote
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);

      console.log(`✅ Quote received:`);
      console.log(`  Input: ${quote.inAmount} (${quote.inputMint})`);
      console.log(`  Output: ${quote.outAmount} (${quote.outputMint})`);
      console.log(`  Price impact: ${quote.priceImpactPct}%`);

      // Get swap transaction
      const swapResponse = await fetch(`${this.jupiterApiUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet.getPublicKey(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });

      if (!swapResponse.ok) {
        const errorText = await swapResponse.text();
        throw new Error(`Jupiter swap API error (${swapResponse.status}): ${errorText}`);
      }

      const swapData = await swapResponse.json();

      if (swapData.error) {
        throw new Error(`Jupiter swap error: ${swapData.error}`);
      }

      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      transaction.sign([this.wallet.wallet]);

      console.log(`📝 Sending transaction...`);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3
        }
      );

      console.log(`⏳ Confirming transaction: ${signature}`);

      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`✅ Swap successful!`);

      return {
        signature,
        quote,
        success: true,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      };

    } catch (error) {
      console.error(`❌ Swap failed:`, error);
      throw error;
    }
  }

  /**
   * Swap SOL for a token
   */
  async buySolToToken(tokenMint, solAmount, slippageBps = 100) {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const lamports = Math.floor(solAmount * 1_000_000_000); // Convert SOL to lamports

    return await this.swap(SOL_MINT, tokenMint, lamports, slippageBps);
  }

  /**
   * Get token info from mint address
   */
  async getTokenInfo(mintAddress) {
    try {
      // Try to get token info from Jupiter token list
      const response = await fetch('https://token.jup.ag/all');
      const tokens = await response.json();

      const token = tokens.find(t => t.address === mintAddress);

      return token || {
        address: mintAddress,
        symbol: mintAddress.slice(0, 8) + '...',
        name: 'Unknown Token',
        decimals: 9
      };
    } catch (error) {
      return {
        address: mintAddress,
        symbol: mintAddress.slice(0, 8) + '...',
        name: 'Unknown Token',
        decimals: 9
      };
    }
  }
}

export default JupiterTrader;
