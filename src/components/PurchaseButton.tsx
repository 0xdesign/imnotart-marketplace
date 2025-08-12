'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { getStripePublishableKey } from '@/lib/stripe'
import type { Artwork } from '@/lib/supabase'

interface PurchaseButtonProps {
  artwork: Artwork
}

const stripePromise = loadStripe(getStripePublishableKey())

export function PurchaseButton({ artwork }: PurchaseButtonProps) {
  const [email, setEmail] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handlePurchase = async () => {
    if (!email) {
      alert('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkId: artwork.id,
          buyerEmail: email,
          buyerWalletAddress: walletAddress || null,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        alert(error)
        return
      }

      const stripe = await stripePromise
      if (!stripe) {
        alert('Stripe failed to load')
        return
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (redirectError) {
        alert(redirectError.message)
      }

    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to initiate purchase. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
      >
        Purchase for ${artwork.price_usd}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your@email.com"
        />
        <p className="text-xs text-gray-500 mt-1">
          You&apos;ll receive the download link at this email
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Wallet Address (Optional)
        </label>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0x..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Provide your wallet address to also receive the NFT
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setShowForm(false)}
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePurchase}
          disabled={isLoading || !email}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : `Pay $${artwork.price_usd}`}
        </button>
      </div>
    </div>
  )
}