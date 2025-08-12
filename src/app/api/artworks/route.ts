import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { storageService, ipfsToHttpUrl, type NFTMetadata } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const walletAddress = formData.get('walletAddress') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const price = formData.get('price') as string
    const maxEditions = formData.get('maxEditions') as string
    const category = formData.get('category') as string
    const tags = formData.get('tags') as string
    const file = formData.get('file') as File

    if (!walletAddress || !title || !price || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // First, ensure artist exists in database
    const { data: existingArtist } = await supabaseAdmin
      .from('artists')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    let artistId = existingArtist?.id

    if (!artistId) {
      const { data: newArtist, error: artistError } = await supabaseAdmin
        .from('artists')
        .insert({
          wallet_address: walletAddress,
          name: `Artist ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        })
        .select('id')
        .single()

      if (artistError) {
        console.error('Artist creation error:', artistError)
        return NextResponse.json(
          { error: 'Failed to create artist profile' },
          { status: 500 }
        )
      }
      artistId = newArtist.id
    }

    // Upload image to IPFS
    const imageIpfsUrl = await storageService.uploadImage(file)
    const imageUrl = ipfsToHttpUrl(imageIpfsUrl)

    // Create NFT metadata
    const metadata: NFTMetadata = {
      name: title,
      description: description || `NFT wallpaper by artist`,
      image: imageIpfsUrl,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL}/artwork/`, // Will be updated after creation
      attributes: [
        {
          trait_type: "Category",
          value: category || "Wallpaper"
        },
        {
          trait_type: "Max Editions",
          value: parseInt(maxEditions)
        },
        {
          trait_type: "Price (USD)",
          value: parseFloat(price)
        }
      ],
      properties: {
        category: category || undefined,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
        artist: `Artist ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      }
    }

    // Upload metadata to IPFS
    const metadataIpfsUrl = await storageService.uploadMetadata(metadata)
    const metadataUrl = ipfsToHttpUrl(metadataIpfsUrl)

    // Create artwork record
    const { data: artwork, error: artworkError } = await supabaseAdmin
      .from('artworks')
      .insert({
        artist_id: artistId,
        title: title,
        description: description,
        price_usd: parseFloat(price),
        max_editions: parseInt(maxEditions),
        category: category || null,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        image_url: imageUrl,
        metadata_url: metadataUrl
      })
      .select()
      .single()

    if (artworkError) {
      console.error('Artwork creation error:', artworkError)
      return NextResponse.json(
        { error: 'Failed to create artwork' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      artwork,
      message: 'Artwork uploaded successfully!' 
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('wallet')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('artworks')
      .select(`
        *,
        artist:artists(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (walletAddress) {
      // Get artworks by specific artist
      const { data: artist } = await supabaseAdmin
        .from('artists')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single()

      if (!artist) {
        return NextResponse.json({ artworks: [] })
      }

      query = query.eq('artist_id', artist.id)
    }

    const { data: artworks, error } = await query

    if (error) {
      console.error('Fetch artworks error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch artworks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ artworks: artworks || [] })

  } catch (error) {
    console.error('Get artworks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}