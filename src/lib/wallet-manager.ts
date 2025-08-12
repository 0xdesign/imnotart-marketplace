import { EventEmitter } from 'events'
import { ethers } from 'ethers'

export interface WalletState {
  address: string | null
  chainId: number | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  connected: boolean
  connecting: boolean
  error: string | null
}

export interface Connection {
  address: string
  chainId: number
  provider: ethers.BrowserProvider
  signer: ethers.JsonRpcSigner
}

type StateCallback = (state: WalletState) => void

export class WalletStateManager extends EventEmitter {
  private connectionState: WalletState
  private reconnectAttempts: number = 0
  private stateSubscribers: Set<StateCallback> = new Set()
  private reconnectTimer: NodeJS.Timeout | null = null
  private persistenceKey = 'imnotart_wallet_connection'
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly RECONNECT_DELAY = 2000
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  private readonly SUPPORTED_CHAINS = [
    1, // Ethereum Mainnet
    8453, // Base Mainnet
    84532, // Base Sepolia
  ]

  constructor() {
    super()
    
    this.connectionState = {
      address: null,
      chainId: null,
      provider: null,
      signer: null,
      connected: false,
      connecting: false,
      error: null
    }

    // Set up event listeners
    this.setupEventListeners()
    
    // Attempt to restore connection on initialization
    if (typeof window !== 'undefined') {
      this.restoreConnectionState()
    }
  }

  /**
   * Connect wallet with retry logic
   */
  async connectWalletWithRetry(): Promise<Connection> {
    if (this.connectionState.connected && this.connectionState.address) {
      return this.getCurrentConnection()!
    }

    if (this.connectionState.connecting) {
      // Wait for ongoing connection
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (!this.connectionState.connecting) {
            clearInterval(checkConnection)
            if (this.connectionState.connected) {
              resolve(this.getCurrentConnection()!)
            } else {
              reject(new Error(this.connectionState.error || 'Connection failed'))
            }
          }
        }, 100)
      })
    }

    this.updateState({ connecting: true, error: null })
    
    try {
      const connection = await this.connectWallet()
      await this.persistConnectionState()
      return connection
    } catch (error: any) {
      this.updateState({ 
        connecting: false, 
        error: error.message 
      })
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++
        await this.delay(this.RECONNECT_DELAY * this.reconnectAttempts)
        return this.connectWalletWithRetry()
      }
      
      throw error
    }
  }

  /**
   * Connect wallet
   */
  private async connectWallet(): Promise<Connection> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or compatible wallet not found')
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      // Validate chain
      if (!this.SUPPORTED_CHAINS.includes(chainId)) {
        await this.switchToSupportedChain()
        return this.connectWallet() // Retry after chain switch
      }

      // Update state
      this.updateState({
        address,
        chainId,
        provider,
        signer,
        connected: true,
        connecting: false,
        error: null
      })

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0
      
      this.emit('connected', { address, chainId })
      
      return { address, chainId, provider, signer }
    } catch (error: any) {
      console.error('Wallet connection failed:', error)
      throw error
    }
  }

  /**
   * Switch to supported chain
   */
  private async switchToSupportedChain(): Promise<void> {
    const targetChainId = this.SUPPORTED_CHAINS[0] // Default to first supported chain
    const chainIdHex = `0x${targetChainId.toString(16)}`
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await this.addChain(targetChainId)
      } else {
        throw switchError
      }
    }
  }

  /**
   * Add chain to wallet
   */
  private async addChain(chainId: number): Promise<void> {
    const chainConfigs: Record<number, any> = {
      8453: {
        chainId: '0x2105',
        chainName: 'Base',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      },
      84532: {
        chainId: '0x14a34',
        chainName: 'Base Sepolia',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      }
    }

    const config = chainConfigs[chainId]
    if (!config) {
      throw new Error(`Chain ${chainId} configuration not found`)
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config]
    })
  }

  /**
   * Persist connection state
   */
  async persistConnectionState(): Promise<void> {
    if (!this.connectionState.connected || !this.connectionState.address) {
      return
    }

    const stateToSave = {
      address: this.connectionState.address,
      chainId: this.connectionState.chainId,
      timestamp: Date.now()
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          this.persistenceKey,
          JSON.stringify(stateToSave)
        )
      }
    } catch (error) {
      console.warn('Failed to persist wallet state:', error)
    }
  }

  /**
   * Restore connection state
   */
  async restoreConnectionState(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }

      const savedState = window.localStorage.getItem(this.persistenceKey)
      if (!savedState) {
        return false
      }

      const parsed = JSON.parse(savedState)
      
      // Check if session is expired
      if (Date.now() - parsed.timestamp > this.SESSION_TIMEOUT) {
        window.localStorage.removeItem(this.persistenceKey)
        return false
      }

      // Check if wallet is still connected
      if (!window.ethereum) {
        return false
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        return false
      }

      // Check if same account
      if (accounts[0].toLowerCase() !== parsed.address.toLowerCase()) {
        window.localStorage.removeItem(this.persistenceKey)
        return false
      }

      // Reconnect
      await this.connectWallet()
      return true
    } catch (error) {
      console.warn('Failed to restore wallet state:', error)
      return false
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnection(): Promise<void> {
    this.updateState({
      address: null,
      chainId: null,
      provider: null,
      signer: null,
      connected: false,
      connecting: false,
      error: null
    })

    // Clear persisted state
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.persistenceKey)
    }

    this.emit('disconnected')
    
    // Attempt reconnection if it was an unexpected disconnect
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++
      console.log(`Attempting wallet reconnection (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`)
      
      try {
        await this.connectWalletWithRetry()
      } catch (error) {
        console.error('Reconnection failed:', error)
        
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect()
        }
      }
    }, this.RECONNECT_DELAY * this.reconnectAttempts)
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined' || !window.ethereum) {
      return
    }

    // Account change
    window.ethereum.on('accountsChanged', async (accounts: string[]) => {
      if (accounts.length === 0) {
        await this.handleDisconnection()
      } else if (accounts[0] !== this.connectionState.address) {
        // Account switched, reconnect
        await this.connectWallet()
      }
    })

    // Chain change
    window.ethereum.on('chainChanged', (chainId: string) => {
      const newChainId = parseInt(chainId, 16)
      
      if (!this.SUPPORTED_CHAINS.includes(newChainId)) {
        this.updateState({ 
          error: `Unsupported chain: ${newChainId}` 
        })
        this.emit('chainError', { chainId: newChainId })
      } else {
        // Reconnect with new chain
        this.connectWallet()
      }
    })

    // Disconnect
    window.ethereum.on('disconnect', () => {
      this.handleDisconnection()
    })
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(updates: Partial<WalletState>): void {
    this.connectionState = {
      ...this.connectionState,
      ...updates
    }

    // Notify subscribers
    this.stateSubscribers.forEach(callback => {
      callback(this.connectionState)
    })

    this.emit('stateChanged', this.connectionState)
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateCallback): () => void {
    this.stateSubscribers.add(callback)
    
    // Call immediately with current state
    callback(this.connectionState)
    
    // Return unsubscribe function
    return () => {
      this.stateSubscribers.delete(callback)
    }
  }

  /**
   * Get current connection
   */
  getCurrentConnection(): Connection | null {
    if (!this.connectionState.connected || 
        !this.connectionState.address ||
        !this.connectionState.provider ||
        !this.connectionState.signer) {
      return null
    }

    return {
      address: this.connectionState.address,
      chainId: this.connectionState.chainId!,
      provider: this.connectionState.provider,
      signer: this.connectionState.signer
    }
  }

  /**
   * Get connection state
   */
  getState(): WalletState {
    return { ...this.connectionState }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    await this.handleDisconnection()
    this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS // Prevent auto-reconnect
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Declare ethereum on window
declare global {
  interface Window {
    ethereum?: any
  }
}

export default WalletStateManager;