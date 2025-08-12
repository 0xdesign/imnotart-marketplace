# ImNotArt NFT Marketplace Deployment Checklist

## 🚀 Pre-Deployment Requirements

### Required Accounts
- [ ] Ethereum wallet with private key for contract deployment
- [ ] Base testnet ETH (get from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [ ] Supabase account - https://supabase.com/
- [ ] Stripe account - https://stripe.com/
- [ ] Web3.storage account - https://web3.storage/
- [ ] Email service (Gmail with app password)

### Required Tools
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] MetaMask or wallet for testing

## 📋 Step-by-Step Deployment

### 1. Clone and Setup Repository
```bash
# Clone the repository
git clone [your-repo-url]
cd imnotart

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Deploy Smart Contract
```bash
# First, ensure you have Base Sepolia ETH
# Get from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

# Configure your deployer wallet in .env.local
# PRIVATE_KEY=your_private_key_here

# Deploy to Base Sepolia testnet
npm run deploy:contract

# Save the deployed contract address!
# Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
```

### 3. Set Up Supabase Database
```bash
# 1. Create new Supabase project at https://app.supabase.com/

# 2. Run SQL in Supabase SQL editor:
npm run setup:database

# This creates:
# - artists table
# - artworks table  
# - purchases table
# - download_tokens table

# 3. Update .env.local with Supabase credentials
```

### 4. Configure Stripe
```bash
# 1. Get API keys from https://dashboard.stripe.com/apikeys

# 2. Create webhook endpoint:
# - Go to https://dashboard.stripe.com/webhooks
# - Add endpoint: https://your-domain.com/api/webhook/stripe
# - Select events: checkout.session.completed

# 3. Update .env.local:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### 5. Set Up Web3.storage
```bash
# 1. Get API token from https://web3.storage/account/

# 2. Update .env.local:
# - WEB3_STORAGE_TOKEN=your_token_here
```

### 6. Configure Email Service
```bash
# For Gmail:
# 1. Enable 2-factor authentication
# 2. Create app-specific password
# 3. Update .env.local:
# - SMTP_HOST=smtp.gmail.com
# - SMTP_PORT=587
# - SMTP_USER=your-email@gmail.com
# - SMTP_PASS=your-app-password
```

### 7. Build and Test Locally
```bash
# Build the application
npm run build

# Run in production mode locally
npm start

# Test key flows:
# 1. Artist wallet connection
# 2. Artwork upload
# 3. Browse marketplace
# 4. Purchase with test card (4242 4242 4242 4242)
# 5. Email delivery
# 6. Download functionality
```

### 8. Deploy to Production

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Configure custom domain if needed
```

#### Option B: Traditional Hosting
```bash
# Build for production
npm run build

# Upload .next folder to your server
# Set up PM2 or similar process manager
# Configure nginx/apache reverse proxy
```

## ✅ Post-Deployment Checklist

### Functionality Testing
- [ ] Artist can connect wallet
- [ ] Artist can upload artwork (check IPFS storage)
- [ ] Artwork appears in marketplace
- [ ] Purchase flow completes successfully
- [ ] Email is sent with download link
- [ ] Download link works and expires correctly
- [ ] NFT mints when wallet address provided

### Security Verification
- [ ] Environment variables are secure
- [ ] Stripe webhook endpoint is protected
- [ ] Download tokens expire after use
- [ ] No sensitive data in client bundle
- [ ] CORS configured correctly

### Performance Checks
- [ ] Images load quickly from IPFS
- [ ] Marketplace grid is responsive
- [ ] Payment processing < 3 seconds
- [ ] Mobile experience is smooth

## 🔧 Troubleshooting

### Smart Contract Issues
- Verify contract is verified on Basescan
- Check wallet has enough ETH for gas
- Ensure correct contract address in env
- Review transaction errors in explorer

### Payment Issues
- Verify Stripe webhook is receiving events
- Check webhook signature validation
- Review Stripe dashboard for errors
- Test with Stripe CLI locally

### IPFS Upload Failures
- Check Web3.storage API limits
- Verify file size < 100MB
- Ensure proper file format (PNG/JPG)
- Check network connectivity

### Email Delivery Problems
- Verify SMTP credentials
- Check spam folder
- Review email service logs
- Test with different providers

## 📊 Monitoring

### Key Metrics to Track
- Daily active artists
- Artworks uploaded per day
- Successful purchases
- Failed transactions
- Email delivery rate
- Download completion rate

### Where to Monitor
- Supabase dashboard for database
- Stripe dashboard for payments
- Web3.storage dashboard for storage
- Vercel/hosting analytics
- Smart contract on Basescan

## 🚨 Emergency Procedures

### If Payments Fail
1. Check Stripe status page
2. Verify webhook is responding
3. Review recent deployments
4. Enable Stripe test mode temporarily

### If IPFS Goes Down
1. Images will still load from cache
2. Disable new uploads temporarily
3. Consider backup storage provider
4. Monitor Web3.storage status

### If Contract Has Issues
1. Contract is non-upgradeable
2. Can pause minting if needed
3. Deploy new contract if critical
4. Migrate existing data

## 📈 Scaling Considerations

At 1,000+ artworks:
- Implement image CDN
- Add database indexes
- Enable caching layer

At 10,000+ users:
- Upgrade Supabase plan
- Implement queuing for uploads
- Add load balancer

## 🎉 Launch Checklist

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Legal terms added
- [ ] Analytics configured
- [ ] Social media announced
- [ ] Support email ready
- [ ] Monitoring alerts set

---

**Next Steps**: After deployment, monitor the first 24 hours closely for any issues. Be ready to respond quickly to user feedback.