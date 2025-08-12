'use client'

import { useState } from 'react'
import { Header } from "@/components/Header"
import { ArtworkUpload } from "@/components/ArtworkUpload"
import { ArtworkGrid } from "@/components/ArtworkGrid"

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>
    }
  }
}

export default function ArtistPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          setIsConnected(true)
          // TODO: Create or fetch artist record
        }
      } else {
        alert('Please install MetaMask to connect your wallet')
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Artist Dashboard
          </h1>
          
          {!isConnected ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start uploading and managing your NFT wallpapers
              </p>
              <button
                onClick={connectWallet}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-white rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Wallet Connected
                    </h2>
                    <p className="text-gray-600 font-mono text-sm">
                      {walletAddress}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsConnected(false)
                      setWalletAddress('')
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Upload New Artwork
                  </h2>
                  <ArtworkUpload 
                    walletAddress={walletAddress}
                    onUploadSuccess={() => window.location.reload()}
                  />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Your Artworks
                  </h2>
                  <ArtworkGrid walletAddress={walletAddress} limit={20} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}