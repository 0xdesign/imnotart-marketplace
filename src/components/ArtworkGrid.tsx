'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase, type Artwork } from '@/lib/supabase'

interface ArtworkGridProps {
  limit?: number
  artistId?: number
  category?: string
  walletAddress?: string
}

export function ArtworkGrid({ limit, artistId, category, walletAddress }: ArtworkGridProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArtworks() {
      try {
        if (walletAddress) {
          // Use API route for wallet-based queries
          const response = await fetch(`/api/artworks?wallet=${encodeURIComponent(walletAddress)}&limit=${limit || 10}`)
          const data = await response.json()
          setArtworks(data.artworks || [])
        } else {
          // Use direct Supabase query for other cases
          let query = supabase
            .from('artworks')
            .select(`
              *,
              artist:artists(*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          if (artistId) {
            query = query.eq('artist_id', artistId)
          }

          if (category) {
            query = query.eq('category', category)
          }

          if (limit) {
            query = query.limit(limit)
          }

          const { data, error } = await query

          if (error) {
            console.error('Error fetching artworks:', error)
            return
          }

          setArtworks(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [limit, artistId, category, walletAddress])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: limit || 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 aspect-square rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No artworks available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {artworks.map((artwork) => (
        <Link 
          key={artwork.id} 
          href={`/artwork/${artwork.id}`}
          className="group cursor-pointer"
        >
          <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
            <Image
              src={artwork.image_url}
              alt={artwork.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </div>
          
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {artwork.title}
          </h3>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-600">
              by {artwork.artist?.name || 'Unknown Artist'}
            </p>
            <p className="font-semibold text-gray-900">
              ${artwork.price_usd}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>{artwork.current_editions}/{artwork.max_editions} minted</span>
            {artwork.category && <span>{artwork.category}</span>}
          </div>
        </Link>
      ))}
    </div>
  )
}