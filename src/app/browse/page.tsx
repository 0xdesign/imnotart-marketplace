import { Header } from "@/components/Header"
import { ArtworkGrid } from "@/components/ArtworkGrid"

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Browse Artworks
          </h1>
          <p className="text-gray-600">
            Discover amazing wallpaper NFTs from talented artists around the world
          </p>
        </div>

        <div className="mb-6">
          {/* TODO: Add filters for category, price range, etc */}
          <div className="flex gap-2 flex-wrap">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              All
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
              Abstract
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
              Nature
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
              Digital Art
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
              Photography
            </button>
          </div>
        </div>

        <ArtworkGrid />
      </main>
    </div>
  )
}