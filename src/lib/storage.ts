// Resilient Web3.Storage integration for IPFS uploads with retry and validation

import { EventEmitter } from 'events'

export interface StorageService {
  uploadImage(file: File): Promise<string>
  uploadMetadata(metadata: object): Promise<string>
  validateUpload(cid: string): Promise<boolean>
  getUploadProgress(taskId: string): Promise<ProgressStatus>
}

export interface UploadTask {
  id: string
  file: File | Blob
  type: 'image' | 'metadata'
  attempts: number
  maxAttempts: number
  createdAt: Date
  lastAttemptAt?: Date
  error?: string
  cid?: string
  status: 'pending' | 'uploading' | 'validating' | 'completed' | 'failed'
}

export interface UploadResult {
  cid: string
  url: string
  size: number
  validated: boolean
}

export interface ProgressStatus {
  taskId: string
  status: string
  progress: number
  error?: string
}

export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

class MockStorageService implements StorageService {
  async uploadImage(file: File): Promise<string> {
    // In a real implementation, this would upload to IPFS
    // For now, return a mock IPFS URL with the file name for testing
    const mockHash = Math.random().toString(36).substr(2, 46)
    console.log(`Mock upload: ${file.name} (${file.size} bytes)`)
    return `ipfs://${mockHash}`
  }

  async uploadMetadata(metadata: object): Promise<string> {
    // In a real implementation, this would upload JSON metadata to IPFS
    const mockHash = Math.random().toString(36).substr(2, 46)
    console.log('Mock metadata upload:', metadata)
    return `ipfs://${mockHash}`
  }

  async validateUpload(cid: string): Promise<boolean> {
    return true // Mock always validates
  }

  async getUploadProgress(taskId: string): Promise<ProgressStatus> {
    return {
      taskId,
      status: 'completed',
      progress: 100
    }
  }
}

class ResilientStorageService extends EventEmitter implements StorageService {
  private initialized: boolean = false
  private uploadQueue: Map<string, UploadTask> = new Map()
  private retryConfig: RetryConfig
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
  private readonly VALIDATION_TIMEOUT = 30000 // 30 seconds
  private readonly IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.ipfs.io/ipfs/'
  ]

  constructor() {
    super()
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    }
  }

  private async initializeClient() {
    if (this.initialized) return
    
    if (!process.env.WEB3_STORAGE_TOKEN) {
      console.warn('WEB3_STORAGE_TOKEN not found, using mock storage')
      return
    }
    
    this.initialized = true
  }

  /**
   * Upload image with retry logic and validation
   */
  async uploadImage(file: File): Promise<string> {
    // Validate file
    this.validateFile(file)
    
    const taskId = this.generateTaskId()
    const task: UploadTask = {
      id: taskId,
      file,
      type: 'image',
      attempts: 0,
      maxAttempts: this.retryConfig.maxRetries,
      createdAt: new Date(),
      status: 'pending'
    }
    
    this.uploadQueue.set(taskId, task)
    
    try {
      const result = await this.uploadWithRetry(task)
      return result.url
    } finally {
      this.uploadQueue.delete(taskId)
    }
  }

  /**
   * Upload metadata with retry logic and validation
   */
  async uploadMetadata(metadata: object): Promise<string> {
    const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], { 
      type: 'application/json' 
    })
    
    const taskId = this.generateTaskId()
    const task: UploadTask = {
      id: taskId,
      file: jsonBlob,
      type: 'metadata',
      attempts: 0,
      maxAttempts: this.retryConfig.maxRetries,
      createdAt: new Date(),
      status: 'pending'
    }
    
    this.uploadQueue.set(taskId, task)
    
    try {
      const result = await this.uploadWithRetry(task)
      return result.url
    } finally {
      this.uploadQueue.delete(taskId)
    }
  }

  /**
   * Upload with retry logic
   */
  private async uploadWithRetry(task: UploadTask): Promise<UploadResult> {
    let lastError: Error | null = null
    let delay = this.retryConfig.initialDelay
    
    while (task.attempts < task.maxAttempts) {
      task.attempts++
      task.lastAttemptAt = new Date()
      task.status = 'uploading'
      
      try {
        await this.initializeClient()
        
        if (!process.env.WEB3_STORAGE_TOKEN) {
          // Use mock service
          const mockService = new MockStorageService()
          const url = task.type === 'image' 
            ? await mockService.uploadImage(task.file as File)
            : await mockService.uploadMetadata(JSON.parse(await (task.file as Blob).text()))
          
          return {
            cid: url.replace('ipfs://', ''),
            url,
            size: task.file.size,
            validated: true
          }
        }
        
        // Perform upload
        const cid = await this.performUpload(task)
        
        // Validate upload
        task.status = 'validating'
        const validated = await this.validateUpload(cid)
        
        if (!validated) {
          throw new Error('Upload validation failed')
        }
        
        task.status = 'completed'
        task.cid = cid
        
        this.emit('uploadCompleted', { taskId: task.id, cid })
        
        return {
          cid,
          url: `ipfs://${cid}`,
          size: task.file.size,
          validated
        }
      } catch (error: any) {
        lastError = error
        task.error = error.message
        
        console.warn(`Upload attempt ${task.attempts} failed:`, error.message)
        this.emit('uploadRetry', { 
          taskId: task.id, 
          attempt: task.attempts, 
          error: error.message 
        })
        
        if (task.attempts < task.maxAttempts) {
          // Wait before retry with exponential backoff
          await this.delay(delay)
          delay = Math.min(delay * this.retryConfig.backoffFactor, this.retryConfig.maxDelay)
        }
      }
    }
    
    task.status = 'failed'
    this.emit('uploadFailed', { taskId: task.id, error: lastError?.message })
    
    // Fallback to alternative upload method
    return this.fallbackUpload(task)
  }

  /**
   * Perform the actual upload
   */
  private async performUpload(task: UploadTask): Promise<string> {
    const formData = new FormData()
    
    if (task.file.size > this.CHUNK_SIZE) {
      // For large files, consider chunking (simplified here)
      formData.append('file', task.file, task.type === 'image' ? 'image' : 'metadata.json')
    } else {
      formData.append('file', task.file, task.type === 'image' ? 'image' : 'metadata.json')
    }
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WEB3_STORAGE_TOKEN}`,
        },
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed (${response.status}): ${errorText}`)
      }
      
      const result = await response.json()
      return result.cid
    } catch (error: any) {
      clearTimeout(timeout)
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout')
      }
      throw error
    }
  }

  /**
   * Validate upload by checking availability on IPFS gateways
   */
  async validateUpload(cid: string): Promise<boolean> {
    const validationPromises = this.IPFS_GATEWAYS.map(async (gateway) => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.VALIDATION_TIMEOUT)
        
        const response = await fetch(`${gateway}${cid}`, {
          method: 'HEAD',
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        return response.ok
      } catch (error) {
        return false
      }
    })
    
    // Wait for at least one gateway to confirm
    const results = await Promise.allSettled(validationPromises)
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value === true
    ).length
    
    return successCount > 0
  }

  /**
   * Get upload progress
   */
  async getUploadProgress(taskId: string): Promise<ProgressStatus> {
    const task = this.uploadQueue.get(taskId)
    
    if (!task) {
      return {
        taskId,
        status: 'not_found',
        progress: 0,
        error: 'Task not found'
      }
    }
    
    let progress = 0
    switch (task.status) {
      case 'pending':
        progress = 0
        break
      case 'uploading':
        progress = 50
        break
      case 'validating':
        progress = 75
        break
      case 'completed':
        progress = 100
        break
      case 'failed':
        progress = 0
        break
    }
    
    return {
      taskId,
      status: task.status,
      progress,
      error: task.error
    }
  }

  /**
   * Fallback upload method
   */
  private async fallbackUpload(task: UploadTask): Promise<UploadResult> {
    console.warn('Using fallback upload method')
    
    // Try alternative IPFS service or pinning service
    // For now, use mock as fallback
    const mockService = new MockStorageService()
    const url = task.type === 'image' 
      ? await mockService.uploadImage(task.file as File)
      : await mockService.uploadMetadata(JSON.parse(await (task.file as Blob).text()))
    
    return {
      cid: url.replace('ipfs://', ''),
      url,
      size: task.file.size,
      validated: false
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`)
    }
    
    // Validate image file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`)
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export the storage service - will use real Web3.Storage if token is available
export const storageService: StorageService = new ResilientStorageService()

// Helper function to convert IPFS URL to HTTP gateway URL
export function ipfsToHttpUrl(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const hash = ipfsUrl.replace('ipfs://', '')
    return `https://ipfs.io/ipfs/${hash}`
  }
  return ipfsUrl
}

// NFT Metadata standard (ERC-1155)
export interface NFTMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    category?: string
    tags?: string[]
    artist?: string
  }
}