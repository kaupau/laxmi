/**
 * Jupiter API type definitions
 */

/**
 * Jupiter quote response
 */
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

/**
 * Jupiter swap response
 */
export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
}

/**
 * Jupiter swap result
 */
export interface JupiterSwapResult {
  signature: string;
  quote: JupiterQuote;
  success: boolean;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
}

/**
 * Jupiter token info
 */
export interface JupiterTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

/**
 * Error response from Jupiter API
 */
export interface JupiterError {
  error: string;
  statusCode?: number;
}
