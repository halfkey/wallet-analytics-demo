import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '../components/WalletProvider';

export const metadata: Metadata = {
  title: 'ChainScope - Solana Wallet Analytics',
  description: 'Pay-per-use Solana wallet analytics powered by x402 payment protocol. Get instant insights into any Solana wallet with micro-payments.',
  keywords: ['Solana', 'wallet', 'analytics', 'x402', 'blockchain', 'crypto', 'USDC', 'pay-per-use'],
  authors: [{ name: 'ChainScope' }],
  openGraph: {
    title: 'ChainScope - Solana Wallet Analytics',
    description: 'Pay-per-use Solana wallet analytics powered by x402 payment protocol',
    url: 'https://chain-scope.dev',
    siteName: 'ChainScope',
    type: 'website',
    images: [
      {
        url: '/chainscope-logo.png',
        width: 1200,
        height: 630,
        alt: 'ChainScope Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChainScope - Solana Wallet Analytics',
    description: 'Pay-per-use Solana wallet analytics powered by x402 payment protocol',
    images: ['/chainscope-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
