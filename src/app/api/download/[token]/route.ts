import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // Verify download token
    const { data: downloadToken, error: tokenError } = await supabaseAdmin
      .from('download_tokens')
      .select(`
        *,
        purchase:purchases!inner(
          *,
          artwork:artworks!inner(*)
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !downloadToken) {
      return NextResponse.json(
        { error: 'Invalid download token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (new Date(downloadToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Download token has expired' },
        { status: 410 }
      )
    }

    // Check download limits
    if (downloadToken.download_count >= downloadToken.max_downloads) {
      return NextResponse.json(
        { error: 'Maximum download limit reached' },
        { status: 429 }
      )
    }

    // Update download count
    await supabaseAdmin
      .from('download_tokens')
      .update({ 
        download_count: downloadToken.download_count + 1,
        used_at: downloadToken.used_at || new Date().toISOString()
      })
      .eq('id', downloadToken.id)

    // In a real implementation, you would:
    // 1. Fetch the actual high-res image from IPFS/storage
    // 2. Stream it to the user
    // For now, we'll redirect to the image URL
    
    const artwork = downloadToken.purchase.artwork
    
    // Create a response that triggers download
    return NextResponse.redirect(artwork.image_url)

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}