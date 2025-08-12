'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            ImNotArt
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/browse" className="text-gray-600 hover:text-gray-900">
              Browse
            </Link>
            <Link href="/artist" className="text-gray-600 hover:text-gray-900">
              Artist Dashboard
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/artist"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Connect Wallet
            </Link>
            
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col space-y-2">
              <Link href="/browse" className="text-gray-600 hover:text-gray-900 py-2">
                Browse
              </Link>
              <Link href="/artist" className="text-gray-600 hover:text-gray-900 py-2">
                Artist Dashboard
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}