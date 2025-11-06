/**
 * Proxy Connection - Solana RPC connection that routes through backend proxy
 * This prevents exposing Helius API key in the frontend
 */

import {
  Connection,
  ConnectionConfig,
  PublicKey,
  SendOptions,
  TransactionSignature,
  Commitment,
  AccountInfo,
  RpcResponseAndContext,
  SignatureResult,
  TransactionConfirmationStrategy
} from '@solana/web3.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.chain-scope.dev';

/**
 * Custom Connection class that proxies RPC calls through backend
 * to keep Helius API key secure
 */
export class ProxyConnection extends Connection {
  private proxyUrl: string;

  constructor(config?: ConnectionConfig) {
    // Pass a dummy URL to the parent Connection constructor
    // We'll override the methods to use the proxy instead
    super('https://api.mainnet-beta.solana.com', config);
    this.proxyUrl = `${API_BASE_URL}/api/v1/rpc`;
  }

  /**
   * Make an RPC call through the backend proxy
   */
  private async proxyRpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        params,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'RPC proxy request failed');
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
  }

  /**
   * Override getAccountInfo to use proxy
   */
  async getAccountInfo(
    publicKey: PublicKey,
    commitmentOrConfig?: Commitment | { commitment?: Commitment; minContextSlot?: number }
  ): Promise<AccountInfo<Buffer> | null> {
    const commitment = typeof commitmentOrConfig === 'string'
      ? commitmentOrConfig
      : commitmentOrConfig?.commitment || 'confirmed';

    const result = await this.proxyRpcCall('getAccountInfo', [
      publicKey.toBase58(),
      { encoding: 'base64', commitment },
    ]);

    if (!result || !result.value) {
      return null;
    }

    const accountInfo = result.value;
    return {
      executable: accountInfo.executable,
      owner: new PublicKey(accountInfo.owner),
      lamports: accountInfo.lamports,
      data: Buffer.from(accountInfo.data[0], 'base64'),
      rentEpoch: accountInfo.rentEpoch,
    };
  }

  /**
   * Override getLatestBlockhash to use proxy
   */
  async getLatestBlockhash(commitment?: Commitment): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    const result = await this.proxyRpcCall('getLatestBlockhash', [
      { commitment: commitment || 'confirmed' },
    ]);

    return {
      blockhash: result.value.blockhash,
      lastValidBlockHeight: result.value.lastValidBlockHeight,
    };
  }

  /**
   * Override sendRawTransaction to use proxy
   */
  async sendRawTransaction(
    rawTransaction: Buffer | Uint8Array | Array<number>,
    options?: SendOptions
  ): Promise<TransactionSignature> {
    const encodedTransaction = Buffer.from(rawTransaction).toString('base64');

    const result = await this.proxyRpcCall('sendTransaction', [
      encodedTransaction,
      {
        encoding: 'base64',
        skipPreflight: options?.skipPreflight || false,
        preflightCommitment: options?.preflightCommitment || 'confirmed',
        maxRetries: options?.maxRetries,
        minContextSlot: options?.minContextSlot,
      },
    ]);

    return result;
  }

  /**
   * Override confirmTransaction to use proxy - supports both signature string and strategy object
   */
  async confirmTransaction(
    strategy: TransactionSignature | TransactionConfirmationStrategy,
    commitment?: Commitment
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    // If it's a string, it's a transaction signature
    const signature = typeof strategy === 'string' ? strategy : (strategy as any).signature;

    const result = await this.proxyRpcCall('confirmTransaction', [
      signature,
      commitment || 'confirmed',
    ]);

    return {
      context: { slot: result.context?.slot || 0 },
      value: result.value || { err: null }
    };
  }
}
