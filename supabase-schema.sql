-- ImNotArt Database Schema
-- 4 tables as specified in requirements

-- Artists table - stores artist wallet addresses and profile info
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artworks table - stores NFT wallpaper metadata
CREATE TABLE artworks (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    token_id INTEGER UNIQUE, -- Will be set after minting
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_usd DECIMAL(10,2) NOT NULL, -- Price in USD
    max_editions INTEGER NOT NULL DEFAULT 1,
    current_editions INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    image_url TEXT NOT NULL, -- IPFS URL for the image
    metadata_url TEXT, -- IPFS URL for metadata JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table - stores payment and purchase info
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_wallet_address VARCHAR(42), -- Optional - only if they want NFT minted
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_session_id VARCHAR(255),
    amount_paid_usd DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    nft_minted BOOLEAN DEFAULT false,
    nft_token_id INTEGER,
    download_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download tokens table - temporary tokens for secure downloads
CREATE TABLE download_tokens (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 3, -- Allow 3 downloads per purchase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_artists_wallet ON artists(wallet_address);
CREATE INDEX idx_artworks_artist ON artworks(artist_id);
CREATE INDEX idx_artworks_active ON artworks(is_active);
CREATE INDEX idx_purchases_email ON purchases(buyer_email);
CREATE INDEX idx_purchases_stripe ON purchases(stripe_payment_intent_id);
CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_download_tokens_expires ON download_tokens(expires_at);

-- RLS (Row Level Security) policies
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;

-- Artists can read/update their own data
CREATE POLICY "Artists can view own data" ON artists FOR SELECT USING (auth.uid()::text = wallet_address);
CREATE POLICY "Artists can update own data" ON artists FOR UPDATE USING (auth.uid()::text = wallet_address);

-- Public can view active artworks
CREATE POLICY "Public can view active artworks" ON artworks FOR SELECT USING (is_active = true);

-- Artists can manage their own artworks
CREATE POLICY "Artists can manage own artworks" ON artworks FOR ALL USING (
    EXISTS (SELECT 1 FROM artists WHERE artists.id = artworks.artist_id AND artists.wallet_address = auth.uid()::text)
);

-- Service role can access all purchases (for webhook processing)
CREATE POLICY "Service can manage purchases" ON purchases FOR ALL USING (auth.role() = 'service_role');

-- Service role can manage download tokens
CREATE POLICY "Service can manage download tokens" ON download_tokens FOR ALL USING (auth.role() = 'service_role');

-- Function to safely increment artwork editions
CREATE OR REPLACE FUNCTION increment_artwork_editions(artwork_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE artworks 
    SET current_editions = current_editions + 1,
        updated_at = NOW()
    WHERE id = artwork_id 
    AND current_editions < max_editions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;