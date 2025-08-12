import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for service operations (webhooks, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export type Artist = {
  id: number
  wallet_address: string
  name?: string
  email?: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export type Artwork = {
  id: number
  artist_id: number
  token_id?: number
  title: string
  description?: string
  price_usd: number
  max_editions: number
  current_editions: number
  category?: string
  tags?: string[]
  image_url: string
  metadata_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  artist?: Artist
}

export type Purchase = {
  id: number
  artwork_id: number
  buyer_email: string
  buyer_wallet_address?: string
  stripe_payment_intent_id: string
  stripe_session_id?: string
  amount_paid_usd: number
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  nft_minted: boolean
  nft_token_id?: number
  download_sent: boolean
  created_at: string
  updated_at: string
  artwork?: Artwork
}

export type DownloadToken = {
  id: number
  purchase_id: number
  token: string
  expires_at: string
  used_at?: string
  download_count: number
  max_downloads: number
  created_at: string
}