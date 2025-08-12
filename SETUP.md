# ImNotArt Setup Instructions

This guide will help you set up the ImNotArt NFT wallpaper marketplace for development and deployment.

## Prerequisites

- Node.js 18+
- A wallet with Base Sepolia ETH (for contract deployment)
- Supabase account
- Stripe account  
- Web3.storage account

## Environment Setup

1. Copy the `.env.local` file and fill in your actual API keys:

```bash
cp .env.local .env.local.example
# Edit .env.local with your actual keys
```

### Required API Keys:

#### Supabase Configuration
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep secret!)

#### Stripe Configuration
1. Create an account at [stripe.com](https://stripe.com)
2. Go to Developers > API keys and copy:
   - `STRIPE_SECRET_KEY`: Your test secret key (starts with `sk_test_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your test publishable key (starts with `pk_test_`)
3. For webhooks (set up later):
   - `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret

#### Base L2 Blockchain Configuration
1. Get Base Sepolia ETH from [faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Export your wallet private key (64 characters, starts with 0x):
   - `PRIVATE_KEY`: Your wallet private key (keep secret!)
3. Get a Basescan API key at [basescan.org](https://basescan.org/apis):
   - `BASESCAN_API_KEY`: For contract verification

#### Web3.Storage Configuration
1. Create an account at [web3.storage](https://web3.storage)
2. Generate an API token:
   - `WEB3_STORAGE_TOKEN`: Your API token

#### Email Configuration
1. Use Gmail with App Password:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail App Password (not regular password)
2. Enable 2FA and generate App Password in Google Account settings

## Database Setup

1. Run the schema in your Supabase project:
```bash
# Copy the contents of supabase-schema.sql
# Paste and run in Supabase SQL Editor
```

## Smart Contract Deployment

1. Ensure your wallet has Base Sepolia ETH (at least 0.01 ETH)
2. Deploy the contract:
```bash
npm run deploy:contract
```
3. Copy the deployed contract address to `CONTRACT_ADDRESS` in `.env.local`

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Testing the Setup

### Test Contract Deployment
```bash
npm run compile  # Should complete without errors
npm run deploy:contract  # Should deploy and show contract address
```

### Test Database Connection
- Visit http://localhost:3000/browse
- Should load without database errors

### Test Stripe Integration
- Try to purchase an artwork
- Should redirect to Stripe checkout

### Test IPFS Upload
- Try to upload an artwork as an artist
- Should successfully upload and show IPFS URL

## Troubleshooting

### Contract Deployment Issues
- Ensure PRIVATE_KEY is exactly 66 characters (starts with 0x)
- Check you have enough Base Sepolia ETH
- Verify RPC URL is correct

### Database Issues
- Check Supabase keys are correct
- Ensure schema was applied correctly
- Check RLS policies are enabled

### Stripe Issues
- Use test mode keys only
- Ensure webhook endpoint is set up
- Check payment methods are enabled

## Production Deployment

1. Update environment variables for production
2. Deploy to Vercel/Netlify
3. Set up Stripe webhook endpoint
4. Update contract to mainnet (if needed)

## Security Notes

- Never commit .env.local to git
- Keep private keys secure
- Use test networks for development
- Enable Supabase RLS policies