'use client'

import { useState } from 'react'

interface ArtworkUploadProps {
  walletAddress: string
  onUploadSuccess: () => void
}

export function ArtworkUpload({ walletAddress, onUploadSuccess }: ArtworkUploadProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    maxEditions: '1',
    category: '',
    tags: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      alert('Please select an image file')
      return
    }

    setUploading(true)

    try {
      // Create form data for API request
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('walletAddress', walletAddress)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('price', formData.price)
      uploadFormData.append('maxEditions', formData.maxEditions)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('tags', formData.tags)

      const response = await fetch('/api/artworks', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      alert(result.message || 'Artwork uploaded successfully!')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        maxEditions: '1',
        category: '',
        tags: ''
      })
      setFile(null)
      setPreview(null)
      
      onUploadSuccess()

    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload artwork. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artwork Image *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {preview ? (
              <div className="space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-w-full h-48 object-cover mx-auto rounded"
                />
                {/* Using img tag here for preview as Image component requires width/height */}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700"
                >
                  Click to upload an image
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter artwork title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your artwork"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (USD) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Editions *
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.maxEditions}
              onChange={(e) => setFormData({...formData, maxEditions: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="Abstract">Abstract</option>
            <option value="Nature">Nature</option>
            <option value="Digital Art">Digital Art</option>
            <option value="Photography">Photography</option>
            <option value="Minimalist">Minimalist</option>
            <option value="Fantasy">Fantasy</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({...formData, tags: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="wallpaper, art, digital (comma separated)"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Artwork'}
        </button>
      </form>
    </div>
  )
}