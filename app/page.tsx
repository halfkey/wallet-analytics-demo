'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace(':3001', ':3000') : 'https://api.chain-scope.dev');
const EXAMPLE_WALLET = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'; // Popular Solana wallet for demo

// Validate Solana wallet address
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

interface X402PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

interface X402PaymentRequired {
  x402Version: number;
  accepts: X402PaymentRequirement[];
  error: string;
}

interface PaymentChallenge {
  protocol: string;
  amount: number;
  currency: string;
  network: string;
  challenge: string;
  facilitatorUrl?: string;
  address?: string;
  payment?: X402PaymentRequirement;
}

interface ApiError {
  error: string;
  message?: string;
  payment?: PaymentChallenge;
  x402Version?: number;
  accepts?: X402PaymentRequirement[];
  statusCode: number;
}

const endpoints = [
  { id: 'overview', name: 'Wallet Overview', price: '0.01', desc: 'Balance, tokens & total value' },
  { id: 'portfolio', name: 'Portfolio', price: '0.05', desc: 'Full token & NFT breakdown' },
  { id: 'activity', name: 'Activity', price: '0.10', desc: 'Transaction history' },
  { id: 'risk', name: 'Risk Analysis', price: '0.10', desc: 'Security assessment' },
];

export default function Home() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [paymentChallenge, setPaymentChallenge] = useState<PaymentChallenge | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Track page view on mount
  useEffect(() => {
    logger.track('page_view', { page: 'home' });
  }, []);

  const handleWalletAddressChange = (value: string) => {
    setWalletAddress(value);
    setValidationError('');
    if (value.trim() && !isValidSolanaAddress(value.trim())) {
      setValidationError('Invalid Solana wallet address');
    }
  };

  const loadExampleWallet = () => {
    logger.track('load_example_wallet');
    setWalletAddress(EXAMPLE_WALLET);
    setValidationError('');
    setError(null);
    setData(null);
    setPaymentChallenge(null);
  };

  const fetchAnalytics = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!isValidSolanaAddress(walletAddress.trim())) {
      setError('Please enter a valid Solana wallet address');
      return;
    }

    logger.track('fetch_analytics', { endpoint: selectedEndpoint, wallet: walletAddress.slice(0, 8) });

    setLoading(true);
    setError(null);
    setData(null);
    setPaymentChallenge(null);
    setPaymentStatus('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/${walletAddress}/${selectedEndpoint}`);

      if (response.status === 402) {
        const x402Response: X402PaymentRequired = await response.json();
        const requirement = x402Response.accepts[0];
        const usdcAmount = parseInt(requirement.maxAmountRequired) / 1_000_000;

        setPaymentChallenge({
          protocol: 'x402',
          amount: usdcAmount,
          currency: 'USDC',
          network: requirement.network,
          challenge: btoa(JSON.stringify(requirement)),
          payment: requirement,
        });
        setPaymentStatus('Payment required - connect wallet to continue');
      } else if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        const errorData: ApiError = await response.json();
        setError(errorData.message || errorData.error || 'Request failed');
      }
    } catch (err: any) {
      const errorMessage = err.message?.includes('fetch')
        ? 'Unable to connect to API. Please check your internet connection.'
        : (err.message || 'An unexpected error occurred. Please try again.');

      setError(errorMessage);
      logger.error('Analytics fetch failed', err, { wallet: walletAddress.slice(0, 8), endpoint: selectedEndpoint });
    } finally {
      setLoading(false);
    }
  };

  const makePayment = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    if (!paymentChallenge) {
      setError('No payment required');
      return;
    }

    setLoading(true);
    setPaymentStatus('Preparing transaction...');
    setError(null);

    try {
      const paymentRequirement = paymentChallenge.payment;
      const recipientAddress = paymentRequirement?.payTo || 'BGXPuAMXdY7BgqLNFACLo5Q4afBkea3jTkTqr62e6uLx';

      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(rpcUrl, { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 });

      const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const recipientPubkey = new PublicKey(recipientAddress);

      const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, recipientPubkey);

      setPaymentStatus('Checking token accounts...');

      try {
        await getAccount(connection, fromTokenAccount);
      } catch (error) {
        setError('No USDC found in wallet - please add USDC first');
        setLoading(false);
        setPaymentStatus('');
        return;
      }

      let toAccountExists = true;
      try {
        await getAccount(connection, toTokenAccount);
      } catch (error) {
        toAccountExists = false;
      }

      const amountInAtomicUnits = Math.floor(paymentChallenge.amount * 1_000_000);
      const transaction = new Transaction();

      if (!toAccountExists) {
        setPaymentStatus('Creating recipient token account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            toTokenAccount,
            recipientPubkey,
            USDC_MINT
          )
        );
      }

      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          amountInAtomicUnits
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setPaymentStatus('Awaiting wallet approval...');
      const signedTransaction = await signTransaction(transaction);

      setPaymentStatus('Sending transaction...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());

      setPaymentStatus('Confirming transaction...');

      // Try to confirm with a reasonable timeout, but proceed even if it times out
      // The backend will verify the transaction on-chain anyway
      try {
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (confirmError: any) {
        console.log('Confirmation timeout, but proceeding with verification:', confirmError.message);
        // Continue anyway - the transaction was sent and backend will verify on-chain
      }

      setPaymentStatus('Verifying payment on-chain...');

      const x402Payment = {
        x402Version: 1,
        scheme: 'exact',
        network: 'solana-mainnet',
        payload: {
          signature: signature,
          fromAddress: publicKey.toBase58(),
        },
      };

      const paymentHeader = Buffer.from(JSON.stringify(x402Payment)).toString('base64');

      const retryResponse = await fetch(`${API_BASE_URL}/api/v1/wallet/${walletAddress}/${selectedEndpoint}`, {
        headers: {
          'X-PAYMENT': paymentHeader,
        },
      });

      if (retryResponse.ok) {
        const result = await retryResponse.json();
        setData(result);
        setPaymentStatus(`Payment verified! TX: ${signature.slice(0, 8)}...${signature.slice(-4)}`);
        setPaymentChallenge(null);
        setError(null);

        logger.track('payment_success', {
          endpoint: selectedEndpoint,
          amount: paymentChallenge?.amount,
          txSignature: signature.slice(0, 8),
        });
      } else {
        const errorData = await retryResponse.json();
        setError(`Payment verification failed: ${errorData.error || 'unknown error'}`);
        setPaymentStatus('');
        logger.error('Payment verification failed', new Error(errorData.error), { endpoint: selectedEndpoint });
      }

    } catch (err: any) {
      let errorMessage = 'Payment failed. Please try again.';

      if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (err.message?.includes('insufficient')) {
        errorMessage = 'Insufficient USDC balance in wallet';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setPaymentStatus('');
      logger.error('Payment failed', err, {
        endpoint: selectedEndpoint,
        amount: paymentChallenge?.amount,
        wallet: publicKey?.toBase58().slice(0, 8),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Top Navigation Bar */}
      <nav className="border-b border-neutral-800 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <img
                src="/chainscope-logo.png"
                alt="ChainScope"
                className="h-10 w-auto brightness-0 invert"
              />
            </div>

            {/* Right side - Wallet only */}
            <div className="flex items-center">
              <WalletMultiButton
                className="!bg-neutral-900 hover:!bg-neutral-800 !border !border-neutral-700 !rounded !font-medium !transition-all !text-xs !px-3 !py-1.5 !text-neutral-400"
                style={{
                  backgroundColor: '#171717',
                  color: '#a3a3a3',
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Main Card */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6 md:p-8">
          {/* Address Input */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Wallet Address
              </label>
              <button
                onClick={loadExampleWallet}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Try Example
              </button>
            </div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => handleWalletAddressChange(e.target.value)}
              placeholder="Enter Solana wallet address"
              className={`w-full px-4 py-2.5 bg-neutral-950 border rounded text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 transition-all font-mono text-sm ${
                validationError
                  ? 'border-red-800 focus:ring-red-700 focus:border-red-700'
                  : 'border-neutral-800 focus:ring-neutral-700 focus:border-neutral-700'
              }`}
            />
            {validationError && (
              <p className="mt-1.5 text-xs text-red-400">{validationError}</p>
            )}
          </div>

          {/* Endpoint Selection */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-neutral-400 mb-3 uppercase tracking-wider">
              Select Analytics Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {endpoints.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEndpoint(ep.id)}
                  className={`group relative p-3.5 rounded border transition-all text-left ${
                    selectedEndpoint === ep.id
                      ? 'border-neutral-600 bg-neutral-800'
                      : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-neutral-200 text-sm">{ep.name}</h3>
                    <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs font-medium rounded border border-neutral-700">
                      {ep.price} USDC
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">{ep.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading || !walletAddress.trim() || !!validationError}
            className="w-full bg-neutral-200 hover:bg-white disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-600 font-medium py-2.5 px-6 rounded transition-all disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Get Analytics'
            )}
          </button>
        </div>

        {/* Status Messages */}
        {paymentStatus && (
          <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded p-3">
            <div className="flex items-center gap-2 text-neutral-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs">{paymentStatus}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-neutral-900 border border-neutral-700 rounded p-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Challenge */}
        {paymentChallenge && (
          <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-sm font-medium text-neutral-300">Payment Required</h3>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Protocol:</span>
                <span className="text-neutral-300 font-mono">{paymentChallenge.protocol.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-500">Amount:</span>
                <span className="text-neutral-200 font-medium">{paymentChallenge.amount} {paymentChallenge.currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Network:</span>
                <span className="text-neutral-300 font-mono">{paymentChallenge.network}</span>
              </div>
            </div>

            {connected ? (
              <button
                onClick={makePayment}
                disabled={loading}
                className="w-full bg-neutral-200 hover:bg-white disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-600 font-medium py-2.5 px-6 rounded transition-all disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Processing...' : `Pay ${paymentChallenge.amount} USDC`}
              </button>
            ) : (
              <div className="text-center py-2.5 text-neutral-500 text-xs">
                Connect your wallet to pay
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-neutral-800">
              <p className="text-xs text-neutral-600 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Payment verified on-chain. Ensure USDC in wallet.
              </p>
            </div>
          </div>
        )}

        {/* Data Display */}
        {data && (
          <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
            <div className="bg-neutral-800/50 px-4 py-2.5 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-neutral-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-xs">Analytics Data</span>
              </div>
            </div>
            <div className="p-4 bg-neutral-950">
              <pre className="text-xs text-neutral-400 overflow-x-auto font-mono">
{JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* API Endpoints Documentation */}
        <div className="mt-12 bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-sm font-medium text-neutral-200 mb-4">API Endpoints</h2>

          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.id} className="border-l-2 border-neutral-700 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono text-neutral-300">GET</code>
                  <code className="text-xs font-mono text-neutral-400">/api/v1/wallet/:address/{ep.id}</code>
                  <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-500 text-xs font-medium rounded">
                    {ep.price} USDC
                  </span>
                </div>
                <p className="text-xs text-neutral-500">{ep.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800">
            <h3 className="text-xs font-medium text-neutral-400 mb-3">Usage</h3>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <pre className="text-xs text-neutral-500 font-mono overflow-x-auto">
{`curl -X GET ${API_BASE_URL}/api/v1/wallet/<address>/overview \\
  -H "X-PAYMENT: <base64_payment_proof>"`}
              </pre>
            </div>
            <p className="text-xs text-neutral-600 mt-2">
              Payment required via x402 protocol. First request returns 402 with payment details.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-neutral-800 text-center">
          <div className="text-xs text-neutral-600 space-y-2">
            <p>
              API: <code className="px-2 py-1 bg-neutral-900 rounded text-neutral-500 font-mono">{API_BASE_URL}</code>
            </p>
            <p className="text-xs text-neutral-700">
              Powered by x402 Protocol • Solana Mainnet
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
