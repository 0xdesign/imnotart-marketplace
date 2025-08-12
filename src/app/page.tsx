import Link from "next/link"
import { ArtworkGrid } from "@/components/ArtworkGrid"
import { Header } from "@/components/Header"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ImNotArt
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Discover and collect beautiful wallpaper NFTs from talented artists
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/browse" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Artworks
            </Link>
            <Link 
              href="/artist" 
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Artist Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Featured Artworks</h2>
          <ArtworkGrid limit={6} />
        </div>
      </main>
    </div>
  )
}
