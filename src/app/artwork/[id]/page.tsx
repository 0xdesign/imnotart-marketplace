import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PurchaseButton } from '@/components/PurchaseButton'
import { supabase } from '@/lib/supabase'

async function getArtwork(id: string) {
  const { data: artwork, error } = await supabase
    .from('artworks')
    .select(`
      *,
      artist:artists(*)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !artwork) {
    return null
  }

  return artwork
}

export default async function ArtworkPage({ params }: { params: { id: string } }) {
  const artwork = await getArtwork(params.id)

  if (!artwork) {
    notFound()
  }

  const isAvailable = artwork.current_editions < artwork.max_editions

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={artwork.image_url}
                alt={artwork.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {artwork.title}
              </h1>
              
              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                <span>by</span>
                <span className="font-semibold text-gray-900">
                  {artwork.artist?.name || 'Unknown Artist'}
                </span>
                {artwork.category && (
                  <>
                    <span>•</span>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {artwork.category}
                    </span>
                  </>
                )}
              </div>
              
              <div className="text-3xl font-bold text-gray-900 mb-4">
                ${artwork.price_usd}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
                <div>
                  <span className="font-semibold text-gray-900">
                    {artwork.current_editions}
                  </span>
                  <span> of </span>
                  <span className="font-semibold text-gray-900">
                    {artwork.max_editions}
                  </span>
                  <span> minted</span>
                </div>
                
                {!isAvailable && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                    SOLD OUT
                  </span>
                )}
              </div>
            </div>
            
            {artwork.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {artwork.description}
                </p>
              </div>
            )}
            
            {artwork.tags && artwork.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {artwork.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t pt-6">
              {isAvailable ? (
                <PurchaseButton artwork={artwork} />
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-400 text-white py-3 rounded-lg cursor-not-allowed"
                >
                  Sold Out
                </button>
              )}
              
              <p className="text-xs text-gray-500 mt-3 text-center">
                You will receive a high-resolution download link via email.
                {' '}Optionally provide your wallet address to mint the NFT.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}