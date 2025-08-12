'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (sessionId) {
      // In a real app, you might verify the session here
      setStatus('success')
    } else {
      setStatus('error')
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing your purchase...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div>
              <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Purchase Successful!
              </h1>
              
              <p className="text-gray-600 mb-6">
                Thank you for your purchase! You will receive an email with your download link within a few minutes.
                If you provided a wallet address, your NFT will be minted shortly.
              </p>
              
              <div className="space-y-3">
                <Link
                  href="/browse"
                  className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse More Artworks
                </Link>
                
                <Link
                  href="/"
                  className="block w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div>
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We couldn&apos;t verify your purchase. Please contact support if you believe this is an error.
              </p>
              
              <Link
                href="/"
                className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}