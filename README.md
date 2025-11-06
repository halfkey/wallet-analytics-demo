# ChainScope - Solana Wallet Analytics Frontend

A modern, production-ready Next.js frontend demonstrating the x402 payment protocol for micropayments on Solana. Built for the [Solana x402 Hackathon](https://solana.com/x402/hackathon).

**Live Demo:** https://chain-scope.dev
**Backend API:** https://github.com/halfkey/wallet-analytics-api

## What is x402?

x402 is a payment protocol that enables micropayments for API access. Instead of API keys or subscriptions, users pay per request using cryptocurrency. This frontend demonstrates a complete x402 payment flow with USDC on Solana.

## Features

- **x402 Payment Integration**: Full implementation of HTTP 402 Payment Required flow
- **Solana Wallet Integration**: Phantom wallet support for USDC payments
- **Real-time Analytics**: Fetch Solana wallet analytics after payment verification
- **Modern UI**: Built with Next.js 16, TypeScript, and Tailwind CSS
- **Production Ready**: Deployed with Docker, SSL, and proper error handling

## How It Works

1. **Request Analytics**: User enters a Solana wallet address
2. **402 Challenge**: Backend returns HTTP 402 with payment requirements
3. **User Pays**: Frontend prompts user to approve USDC payment via Phantom
4. **Verification**: Transaction is verified on-chain
5. **Data Delivery**: Analytics data is returned after successful payment

## x402 Payment Flow

```
Frontend                Backend                 Solana Blockchain
   |                       |                           |
   |---GET /analytics----->|                           |
   |                       |                           |
   |<--402 + Challenge-----|                           |
   |                       |                           |
   |--Create TX----------->|                           |
   |                       |                           |
   |<--TX Details----------|                           |
   |                       |                           |
   |--Sign & Send TX-------|-------------------------->|
   |                       |                           |
   |                       |<--Verify TX---------------|
   |                       |                           |
   |---Retry with proof--->|                           |
   |                       |                           |
   |<--200 + Data----------|                           |
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Solana Web3.js
- **Wallet**: Phantom Wallet Adapter
- **Payment**: x402 Protocol with USDC

## Prerequisites

- Node.js 18.0.0 or higher
- pnpm (recommended) or npm
- Phantom wallet browser extension
- USDC on Solana mainnet (for live payments)

## Installation

```bash
# Clone the repository
git clone https://github.com/halfkey/wallet-analytics-demo
cd wallet-analytics-demo

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

## Environment Variables

```bash
# API endpoint
NEXT_PUBLIC_API_URL=https://api.chain-scope.dev

# For local development
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Project Structure

```
app/
├── page.tsx              # Main application page
├── layout.tsx            # Root layout
└── globals.css           # Global styles

components/               # Reusable components (if any)

utils/
└── logger.ts            # Error logging and analytics

public/
└── favicon.ico          # Site favicon
```

## Key Features Demonstrated

### 1. x402 Payment Protocol

The app implements the complete x402 flow:

- Detects HTTP 402 responses
- Parses payment challenges
- Creates Solana transactions with proper memo format
- Verifies payments on-chain
- Retries requests with payment proof

### 2. Phantom Wallet Integration

- Auto-detects wallet installation
- Connects to user's wallet
- Requests transaction signatures
- Handles user rejections gracefully

### 3. Error Handling

- Network errors
- Payment failures
- Invalid wallet addresses
- Insufficient USDC balance
- Transaction timeouts

### 4. User Experience

- Loading states
- Clear error messages
- Transaction status updates
- Example wallet for testing
- Responsive design

## API Endpoints

The frontend connects to these backend endpoints:

### Wallet Overview
```
GET /api/v1/wallet/{address}/overview
Price: 0.01 USDC
```

### Portfolio Analysis
```
GET /api/v1/wallet/{address}/portfolio
Price: 0.05 USDC
```

### Activity Analysis
```
GET /api/v1/wallet/{address}/activity
Price: 0.10 USDC
```

### Risk Assessment
```
GET /api/v1/wallet/{address}/risk
Price: 0.10 USDC
```

## Docker Deployment

The app includes Docker support for production deployment:

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f

# Stop container
docker compose -f docker-compose.production.yml down
```

## Payment Testing

For testing, you can use the example wallet address:
```
DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK
```

**Note**: You'll need USDC in your Phantom wallet to complete payments. Prices range from 0.01 to 0.10 USDC per request.

## x402 Implementation Details

### Payment Challenge Format

When the backend returns 402, it includes:

```json
{
  "x402Version": 1,
  "paymentRequired": true,
  "acceptedCurrencies": ["USDC"],
  "amount": "0.05",
  "recipient": "<merchant_wallet>",
  "memo": "<unique_payment_id>"
}
```

### Payment Proof

The frontend includes payment proof in retry requests:

```
X-PAYMENT: <base64_encoded_payment_details>
```

### Verification

The backend verifies:
- Transaction signature is valid
- Amount matches required price
- Recipient is correct
- Memo matches the challenge
- Transaction is recent (< 5 minutes)

## Security Features

- Input validation for wallet addresses
- Rate limiting on backend
- Transaction amount verification
- Timeout handling
- No private key storage
- Client-side wallet signing only

## Browser Support

- Chrome/Edge (with Phantom extension)
- Firefox (with Phantom extension)
- Brave (with Phantom extension)

## Troubleshooting

### Wallet Not Detected
1. Install Phantom wallet extension
2. Refresh the page
3. Check browser console for errors

### Payment Fails
1. Ensure you have sufficient USDC
2. Check network (must be on Solana mainnet)
3. Try increasing transaction priority fee
4. Check if wallet is locked

### Transaction Timeout
1. Check Solana network status
2. Retry the transaction
3. Increase timeout in wallet settings

## Performance

- Initial load: < 2s
- Payment verification: 2-5s
- API response (after payment): < 1s

## License

MIT

## Links

- **Live Demo**: https://chain-scope.dev
- **Backend API**: https://api.chain-scope.dev
- **API Repository**: https://github.com/halfkey/wallet-analytics-api
- **x402 Hackathon**: https://solana.com/x402/hackathon

## Support

For issues or questions:
- Open a GitHub issue
- Check the backend API documentation
- Review x402 protocol specs

## Acknowledgments

Built for the Solana x402 Hackathon. Demonstrates practical implementation of micropayments for API access using the x402 payment protocol on Solana.
