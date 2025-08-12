import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { artworkId, buyerEmail, buyerWalletAddress } = await request.json()

    if (!artworkId || !buyerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch artwork details
    const { data: artwork, error: artworkError } = await supabaseAdmin
      .from('artworks')
      .select(`
        *,
        artist:artists(*)
      `)
      .eq('id', artworkId)
      .single()

    if (artworkError || !artwork) {
      return NextResponse.json(
        { error: 'Artwork not found' },
        { status: 404 }
      )
    }

    // Check if artwork is still available
    if (artwork.current_editions >= artwork.max_editions) {
      return NextResponse.json(
        { error: 'Artwork sold out' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: artwork.title,
              description: artwork.description || 'NFT Wallpaper',
              images: [artwork.image_url],
            },
            unit_amount: Math.round(artwork.price_usd * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/artwork/${artworkId}`,
      customer_email: buyerEmail,
      metadata: {
        artworkId: artworkId.toString(),
        buyerEmail,
        buyerWalletAddress: buyerWalletAddress || '',
      },
    })

    return NextResponse.json({ sessionId: session.id })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}