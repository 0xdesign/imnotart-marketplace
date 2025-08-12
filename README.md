# ImNotArt - NFT Wallpaper Marketplace

A complete NFT wallpaper marketplace built with Next.js 14, Supabase, Stripe, and Base L2 blockchain. Artists can upload wallpapers and sell them as NFTs, while buyers can purchase with credit cards and download high-resolution images.

## Features

### For Artists
- Connect wallet via MetaMask
- Upload wallpaper images to IPFS
- Set price and edition limits
- Automatic royalty collection (10%)
- View sales and earnings

### For Buyers
- Browse wallpaper collection
- Purchase with credit card (Stripe)
- Email delivery of download links
- Optional NFT minting to wallet
- High-resolution downloads

### Technical Features
- ERC-1155 smart contract on Base L2
- IPFS storage via web3.storage
- Email-based delivery system
- Secure download tokens with expiration
- Edition limit enforcement
- Mobile-first responsive design

## Quick Start

1. **Clone and Install**
   ```bash
   cd imnotart
   npm install
   ```

2. **Set up Environment Variables**
   - Copy `.env.local` and fill in your API keys
   - See [SETUP.md](./SETUP.md) for detailed instructions

3. **Deploy Smart Contract**
   ```bash
   npm run compile
   npm run deploy:contract
   # Copy contract address to .env.local
   ```

4. **Set up Database**
   - Run `supabase-schema.sql` in your Supabase project

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
imnotart/
├── contracts/           # Smart contracts
│   └── ImNotArtNFT.sol # ERC-1155 NFT contract
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/        # API routes
│   │   ├── artist/     # Artist dashboard
│   │   ├── artwork/    # Artwork detail pages
│   │   └── browse/     # Browse marketplace
│   ├── components/     # React components
│   │   ├── ArtworkGrid.tsx
│   │   ├── ArtworkUpload.tsx
│   │   ├── Header.tsx
│   │   └── PurchaseButton.tsx
│   └── lib/            # Utilities
│       ├── contract.ts  # Smart contract service
│       ├── email.ts     # Email delivery
│       ├── storage.ts   # IPFS storage
│       ├── stripe.ts    # Payment processing
│       └── supabase.ts  # Database client
├── scripts/            # Deployment scripts
├── supabase-schema.sql # Database schema
└── hardhat.config.js   # Blockchain config
```

## API Endpoints

### Artworks
- `GET /api/artworks` - List artworks (with optional wallet filter)
- `POST /api/artworks` - Create new artwork (artist only)

### Payments
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/webhook/stripe` - Handle Stripe webhooks

### Downloads
- `GET /api/download/[token]` - Download artwork with token

## Database Schema

Four main tables:
- `artists` - Artist profiles with wallet addresses
- `artworks` - NFT wallpaper metadata and pricing
- `purchases` - Payment and delivery records
- `download_tokens` - Secure download links with expiration

## Smart Contract

Simple ERC-1155 implementation with:
- Artist royalties (10% on secondary sales)
- Edition limits per artwork
- Metadata URI support
- Owner-controlled minting

Contract deployed to Base Sepolia testnet.

## Testing Checklist

### Smart Contract
- [ ] Contract compiles without errors
- [ ] Can deploy to Base testnet
- [ ] Contract owner can create tokens
- [ ] Contract owner can mint tokens to buyers
- [ ] Edition limits are enforced
- [ ] Royalty info returns correctly

### Artist Flow
- [ ] Wallet connection works (MetaMask)
- [ ] Can upload image files
- [ ] Images are uploaded to IPFS
- [ ] Artwork metadata is created
- [ ] Artwork appears in artist dashboard
- [ ] Form validation works correctly

### Purchase Flow
- [ ] Browse page shows available artworks
- [ ] Artwork detail page loads correctly
- [ ] Can enter email and wallet address
- [ ] Stripe checkout redirects properly
- [ ] Payment success triggers webhook
- [ ] Download email is sent
- [ ] Download link works and expires
- [ ] NFT is minted if wallet provided

### Email System
- [ ] SMTP configuration works
- [ ] Email template renders correctly
- [ ] Download links are secure
- [ ] Links expire after 7 days
- [ ] Maximum downloads enforced (3x)

### Error Handling
- [ ] Sold out artworks show correct message
- [ ] Invalid download tokens return 404
- [ ] File upload size limits enforced
- [ ] Payment failures are handled gracefully
- [ ] Webhook failures don't crash app

## Deployment

### Development
```bash
npm run dev
```

### Production
1. Deploy to Vercel/Netlify
2. Set production environment variables
3. Configure Stripe webhook endpoint
4. Deploy contract to Base mainnet (optional)

## Environment Variables

Required for full functionality:
- Supabase: Database and auth
- Stripe: Payment processing  
- Base RPC: Blockchain interaction
- Web3.Storage: IPFS uploads
- Email: Download delivery

See `SETUP.md` for detailed configuration.

## Architecture Decisions

### MVP Focus
- Email-based delivery (no user accounts)
- Simple ERC-1155 contract (no upgradeability)
- Credit card payments only
- Single marketplace (no multi-tenant)

### Security
- Row Level Security (RLS) on Supabase
- Expiring download tokens
- Input validation on uploads
- Webhook signature verification

### Scalability
- IPFS for decentralized storage
- Separate API routes for heavy operations
- Efficient database queries with indexes
- Mobile-first responsive design

## Support

For setup issues, check:
1. Environment variables are correct
2. Database schema was applied
3. Smart contract is deployed
4. Webhook endpoint is configured

## License

MIT License - see LICENSE file for details.

---

Built with Next.js 14, Supabase, Stripe, and Base L2 blockchain.
