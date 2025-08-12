import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDownloadEmail } from '@/lib/email'
import Stripe from 'stripe'
import crypto from 'crypto'

// In-memory cache for processed events (in production, use Redis or DB)
const processedEvents = new Map<string, { timestamp: number; result: any }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Clean up old processed events
setInterval(() => {
  const now = Date.now()
  for (const [eventId, data] of processedEvents.entries()) {
    if (now - data.timestamp > CACHE_TTL) {
      processedEvents.delete(eventId)
    }
  }
}, 60 * 60 * 1000) // Clean up every hour

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  const idempotencyKey = request.headers.get('stripe-idempotency-key') || 
                         request.headers.get('x-stripe-idempotency-key')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Generate a unique key for this event
  const eventKey = idempotencyKey || event.id
  
  // Check if we've already processed this event
  const existingResult = await checkProcessedEvent(eventKey)
  if (existingResult) {
    console.log(`Event ${eventKey} already processed, returning cached result`)
    return NextResponse.json(existingResult)
  }

  // Use database transaction for atomicity
  const result = await processEventWithTransaction(event)
  
  // Store the result for idempotency
  await markEventProcessed(eventKey, result)
  
  return NextResponse.json(result)
}

/**
 * Check if event has already been processed
 */
async function checkProcessedEvent(eventKey: string): Promise<any | null> {
  // Check in-memory cache first
  const cached = processedEvents.get(eventKey)
  if (cached) {
    return cached.result
  }
  
  // Check database for processed events
  try {
    const { data } = await supabaseAdmin
      .from('webhook_events')
      .select('result')
      .eq('event_id', eventKey)
      .single()
    
    if (data) {
      // Cache it for future requests
      processedEvents.set(eventKey, {
        timestamp: Date.now(),
        result: data.result
      })
      return data.result
    }
  } catch (error) {
    // Event not found, which is expected for new events
  }
  
  return null
}

/**
 * Mark event as processed
 */
async function markEventProcessed(eventKey: string, result: any): Promise<void> {
  // Store in memory cache
  processedEvents.set(eventKey, {
    timestamp: Date.now(),
    result
  })
  
  // Store in database for persistence
  try {
    await supabaseAdmin
      .from('webhook_events')
      .insert({
        event_id: eventKey,
        result,
        processed_at: new Date().toISOString()
      })
      .single()
  } catch (error) {
    console.error('Error storing processed event:', error)
    // Don't fail the webhook if we can't store the result
  }
}

/**
 * Process event within a database transaction
 */
async function processEventWithTransaction(event: Stripe.Event): Promise<{ received: boolean; error?: string }> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        const artworkId = parseInt(session.metadata?.artworkId || '0')
        const buyerEmail = session.metadata?.buyerEmail
        const buyerWalletAddress = session.metadata?.buyerWalletAddress

        if (!artworkId || !buyerEmail) {
          console.error('Missing metadata in session:', session.id)
          return { received: false, error: 'Missing required metadata' }
        }

        // Check if purchase already exists (additional idempotency check)
        const { data: existingPurchase } = await supabaseAdmin
          .from('purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single()
        
        if (existingPurchase) {
          console.log(`Purchase already exists for session ${session.id}`)
          return { received: true }
        }

        // Start transaction-like operations
        let purchase: any = null
        let rollbackNeeded = false
        
        try {
          // Create purchase record with lock
          const { data: newPurchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .insert({
              artwork_id: artworkId,
              buyer_email: buyerEmail,
              buyer_wallet_address: buyerWalletAddress || null,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_session_id: session.id,
              amount_paid_usd: (session.amount_total || 0) / 100,
              payment_status: 'completed',
              idempotency_key: generateIdempotencyKey(session.id)
            })
            .select()
            .single()

          if (purchaseError) {
            throw new Error(`Error creating purchase: ${purchaseError.message}`)
          }
          
          purchase = newPurchase
          rollbackNeeded = true

          // Update artwork edition count atomically
          const { error: updateError } = await supabaseAdmin.rpc(
            'increment_artwork_editions',
            { artwork_id: artworkId }
          )

          if (updateError) {
            throw new Error(`Error updating artwork editions: ${updateError.message}`)
          }

          // Create download token with better entropy
          const downloadToken = generateSecureToken()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days to download

          const { error: tokenError } = await supabaseAdmin
            .from('download_tokens')
            .insert({
              purchase_id: purchase.id,
              token: downloadToken,
              expires_at: expiresAt.toISOString(),
              idempotency_key: generateIdempotencyKey(`${session.id}_token`)
            })

          if (tokenError) {
            throw new Error(`Error creating download token: ${tokenError.message}`)
          }

          // Send download email
          const { data: artwork } = await supabaseAdmin
            .from('artworks')
            .select(`
              *,
              artists!inner(name, wallet_address)
            `)
            .eq('id', artworkId)
            .single()

          if (!artwork) {
            throw new Error('Artwork not found')
          }

          const emailSent = await sendDownloadEmailWithRetry({
            buyerEmail,
            artworkTitle: artwork.title,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            artistName: (artwork.artists as any)?.name || 'Unknown Artist',
            downloadToken,
            purchaseAmount: (session.amount_total || 0) / 100
          })

          if (emailSent) {
            await supabaseAdmin
              .from('purchases')
              .update({ download_sent: true })
              .eq('id', purchase.id)
          }

          // Mint NFT if wallet address provided
          if (buyerWalletAddress && artwork) {
            // Queue NFT minting as a separate async job to avoid blocking
            queueNFTMinting({
              purchaseId: purchase.id,
              artworkId,
              artwork,
              buyerWalletAddress,
              sessionId: session.id
            }).catch(error => {
              console.error('Error queuing NFT minting:', error)
              // Don't fail the webhook - NFT minting is optional
            })
          }
          
          rollbackNeeded = false
          return { received: true }
          
        } catch (error: any) {
          console.error('Error processing purchase:', error)
          
          // Rollback purchase if needed
          if (rollbackNeeded && purchase?.id) {
            await supabaseAdmin
              .from('purchases')
              .delete()
              .eq('id', purchase.id)
          }
          
          throw error
        }
        
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update purchase status to failed
        const { error } = await supabaseAdmin
          .from('purchases')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Error updating failed payment:', error)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return { received: true }

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return { 
      received: false, 
      error: error.message || 'Webhook processing failed' 
    }
  }
}

/**
 * Generate secure download token
 */
function generateSecureToken(): string {
  return `dl_${crypto.randomBytes(32).toString('hex')}`
}

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex')
}

/**
 * Send email with retry logic
 */
async function sendDownloadEmailWithRetry(
  params: Parameters<typeof sendDownloadEmail>[0],
  maxRetries = 3
): Promise<boolean> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendDownloadEmail(params)
      if (result) return true
    } catch (error: any) {
      lastError = error
      console.warn(`Email send attempt ${attempt} failed:`, error.message)
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }
  
  console.error('All email send attempts failed:', lastError)
  return false
}

/**
 * Queue NFT minting as an async job
 */
async function queueNFTMinting(params: {
  purchaseId: number
  artworkId: number
  artwork: any
  buyerWalletAddress: string
  sessionId: string
}): Promise<void> {
  // In production, this would add to a job queue (e.g., Bull, BullMQ)
  // For now, process inline but with error isolation
  
  setTimeout(async () => {
    try {
      const { getContractService } = await import('@/lib/contract')
      const contractService = getContractService()
      
      // Check if this artwork already has a token ID
      if (!params.artwork.token_id) {
        // Create token on contract first
        const tokenId = await contractService.createToken(
          params.artwork.artists.wallet_address,
          params.artwork.max_editions,
          params.artwork.metadata_url
        )
        
        // Update artwork with token ID
        await supabaseAdmin
          .from('artworks')
          .update({ token_id: tokenId })
          .eq('id', params.artworkId)
          
        params.artwork.token_id = tokenId
      }
      
      // Mint the token to the buyer
      const txHash = await contractService.mintToken(
        params.artwork.token_id,
        params.buyerWalletAddress,
        1
      )
      
      // Update purchase record with NFT info
      await supabaseAdmin
        .from('purchases')
        .update({ 
          nft_minted: true,
          nft_token_id: params.artwork.token_id,
          nft_tx_hash: txHash
        })
        .eq('id', params.purchaseId)
        
      console.log(`NFT minted successfully. Token ID: ${params.artwork.token_id}, TX: ${txHash}`)
      
    } catch (error) {
      console.error('Error minting NFT:', error)
      
      // Store error for manual review
      await supabaseAdmin
        .from('nft_minting_errors')
        .insert({
          purchase_id: params.purchaseId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_details: error,
          session_id: params.sessionId
        })
    }
  }, 1000) // Process after 1 second to avoid blocking webhook response
}

// Stripe webhooks need raw body
export const runtime = 'nodejs'