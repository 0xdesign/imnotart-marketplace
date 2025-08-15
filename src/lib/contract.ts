import { ethers } from 'ethers'
import { EventEmitter } from 'events'

// Contract ABI for the ImNotArtNFT contract (only the functions we need)
const CONTRACT_ABI = [
  "function createToken(address artist, uint256 maxSupply, string memory metadataURI) external returns (uint256)",
  "function mintToken(uint256 tokenId, address buyer, uint256 amount) external",
  "function getTokenInfo(uint256 tokenId) external view returns (tuple(address artist, uint256 maxSupply, uint256 currentSupply, uint256 royaltyPercentage, string metadataURI))",
  "function owner() external view returns (address)",
  "event TokenCreated(uint256 indexed tokenId, address indexed artist)",
  "event TokenMinted(uint256 indexed tokenId, address indexed buyer, uint256 amount)"
]

interface MintParams {
  tokenId: number
  buyerAddress: string
  amount: number
}

interface MintResult {
  txHash: string
  gasUsed: bigint
  effectiveGasPrice: bigint
  totalCost: bigint
  blockNumber: number
}

interface TxStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  blockNumber?: number
  gasUsed?: bigint
  error?: string
}

interface GasEstimate {
  estimatedGas: bigint
  gasPrice: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  totalCostWei: bigint
  totalCostEth: string
}

export class ContractService extends EventEmitter {
  private provider: ethers.JsonRpcProvider
  private contract: ethers.Contract
  private wallet: ethers.Wallet
  private gasEstimator: GasEstimator
  private transactionMonitor: TransactionMonitor
  private readonly GAS_BUFFER = 1.2 // 20% buffer for gas estimation
  private readonly MAX_GAS_PRICE = ethers.parseUnits('100', 'gwei')
  private readonly CONFIRMATION_BLOCKS = 2

  constructor() {
    super()
    
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is required')
    }
    
    if (!process.env.CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS environment variable is required')
    }

    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org'
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
    this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet)
    
    // Initialize helpers
    this.gasEstimator = new GasEstimator(this.provider)
    this.transactionMonitor = new TransactionMonitor(this.provider)
    
    // Set up event listeners
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for contract events
    this.contract.on('TokenCreated', (tokenId, artist) => {
      console.log(`Token created: ID ${tokenId} for artist ${artist}`)
      this.emit('tokenCreated', { tokenId, artist })
    })
    
    this.contract.on('TokenMinted', (tokenId, buyer, amount) => {
      console.log(`Token minted: ID ${tokenId} to ${buyer}, amount ${amount}`)
      this.emit('tokenMinted', { tokenId, buyer, amount })
    })
  }

  /**
   * Create a new token on the contract with gas estimation
   */
  async createToken(artistAddress: string, maxSupply: number, metadataURI: string): Promise<number> {
    try {
      console.log(`Creating token for artist ${artistAddress}, maxSupply: ${maxSupply}`)
      
      // Estimate gas
      const gasEstimate = await this.estimateGasWithBuffer(
        'createToken',
        [artistAddress, maxSupply, metadataURI]
      )
      
      console.log(`Gas estimate for createToken: ${gasEstimate.totalCostEth} ETH`)
      
      // Check if gas price is reasonable
      if (gasEstimate.gasPrice > this.MAX_GAS_PRICE) {
        throw new Error(`Gas price too high: ${ethers.formatUnits(gasEstimate.gasPrice, 'gwei')} gwei`)
      }
      
      // Send transaction with estimated gas
      const tx = await this.contract.createToken(
        artistAddress,
        maxSupply,
        metadataURI,
        {
          gasLimit: gasEstimate.estimatedGas,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
        }
      )
      
      // Monitor transaction
      this.emit('transactionSent', { hash: tx.hash, method: 'createToken' })
      const monitorPromise = this.transactionMonitor.monitorTransaction(tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait(this.CONFIRMATION_BLOCKS)
      
      // Get monitoring result
      const status = await monitorPromise
      
      if (status.status === 'failed') {
        throw new Error(`Transaction failed: ${status.error}`)
      }
      
      // Find the TokenCreated event to get the token ID
      const event = receipt.logs.find((log: ethers.Log) => {
        try {
          const parsed = this.contract.interface.parseLog(log)
          return parsed?.name === 'TokenCreated'
        } catch {
          return false
        }
      })
      
      if (event) {
        const parsed = this.contract.interface.parseLog(event)
        const tokenId = Number(parsed?.args[0])
        console.log(`Token created with ID: ${tokenId}, gas used: ${receipt.gasUsed}`)
        
        this.emit('tokenCreated', {
          tokenId,
          txHash: receipt.hash,
          gasUsed: receipt.gasUsed,
          blockNumber: receipt.blockNumber
        })
        
        return tokenId
      }
      
      throw new Error('TokenCreated event not found in transaction receipt')
      
    } catch (error: any) {
      console.error('Error creating token:', error)
      await this.handleTransactionFailure(error)
      throw error
    }
  }

  /**
   * Mint an existing token to a buyer with gas estimation
   */
  async mintNFTWithGasEstimation(params: MintParams): Promise<MintResult> {
    try {
      console.log(`Minting token ${params.tokenId} to ${params.buyerAddress}, amount: ${params.amount}`)
      
      // Estimate gas
      const gasEstimate = await this.estimateGasWithBuffer(
        'mintToken',
        [params.tokenId, params.buyerAddress, params.amount]
      )
      
      console.log(`Gas estimate for mintToken: ${gasEstimate.totalCostEth} ETH`)
      
      // Check if gas price is reasonable
      if (gasEstimate.gasPrice > this.MAX_GAS_PRICE) {
        // Try again with lower priority fee
        gasEstimate.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas / 2n
        gasEstimate.maxFeePerGas = gasEstimate.gasPrice + gasEstimate.maxPriorityFeePerGas
        
        if (gasEstimate.maxFeePerGas > this.MAX_GAS_PRICE) {
          throw new Error(`Gas price too high: ${ethers.formatUnits(gasEstimate.gasPrice, 'gwei')} gwei`)
        }
      }
      
      // Send transaction with estimated gas
      const tx = await this.contract.mintToken(
        params.tokenId,
        params.buyerAddress,
        params.amount,
        {
          gasLimit: gasEstimate.estimatedGas,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
        }
      )
      
      // Monitor transaction
      this.emit('transactionSent', { hash: tx.hash, method: 'mintToken' })
      const status = await this.monitorTransaction(tx.hash)
      
      if (status.status === 'failed') {
        throw new Error(`Transaction failed: ${status.error}`)
      }
      
      // Wait for confirmation
      const receipt = await tx.wait(this.CONFIRMATION_BLOCKS)
      
      const result: MintResult = {
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice || gasEstimate.gasPrice,
        totalCost: receipt.gasUsed.mul(receipt.gasPrice || gasEstimate.gasPrice),
        blockNumber: receipt.blockNumber
      }
      
      console.log(`Token minted successfully:`, result)
      
      this.emit('tokenMinted', {
        tokenId: params.tokenId,
        buyer: params.buyerAddress,
        amount: params.amount,
        ...result
      })
      
      return result
      
    } catch (error: any) {
      console.error('Error minting token:', error)
      await this.handleTransactionFailure(error)
      throw error
    }
  }

  /**
   * Legacy mint method for backward compatibility
   */
  async mintToken(tokenId: number, buyerAddress: string, amount: number = 1): Promise<string> {
    const result = await this.mintNFTWithGasEstimation({ tokenId, buyerAddress, amount })
    return result.txHash
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(txHash: string): Promise<TxStatus> {
    return this.transactionMonitor.monitorTransaction(txHash)
  }

  /**
   * Estimate gas with buffer
   */
  private async estimateGasWithBuffer(method: string, params: any[]): Promise<GasEstimate> {
    try {
      // Estimate gas for the transaction
      const estimatedGas = await this.contract[method].estimateGas(...params)
      
      // Add buffer
      const gasWithBuffer = BigInt(Math.floor(Number(estimatedGas) * this.GAS_BUFFER))
      
      // Get current gas prices
      const feeData = await this.provider.getFeeData()
      const gasPrice = feeData.gasPrice || ethers.parseUnits('10', 'gwei')
      const maxFeePerGas = feeData.maxFeePerGas || gasPrice
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')
      
      const totalCostWei = gasWithBuffer * gasPrice
      const totalCostEth = ethers.formatEther(totalCostWei)
      
      return {
        estimatedGas: gasWithBuffer,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCostWei,
        totalCostEth
      }
    } catch (error: any) {
      console.error(`Gas estimation failed for ${method}:`, error)
      
      // Fallback gas values
      const fallbackGas = BigInt(500000) // 500k gas as fallback
      const gasPrice = ethers.parseUnits('10', 'gwei')
      
      return {
        estimatedGas: fallbackGas,
        gasPrice,
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        totalCostWei: fallbackGas * gasPrice,
        totalCostEth: ethers.formatEther(fallbackGas * gasPrice)
      }
    }
  }

  /**
   * Handle transaction failure
   */
  private async handleTransactionFailure(error: Error): Promise<void> {
    console.error('Transaction failed:', error)
    
    // Extract useful error information
    const errorInfo: any = {
      message: error.message,
      code: (error as any).code,
      reason: (error as any).reason,
      transaction: (error as any).transaction
    }
    
    // Check common error patterns
    if (errorInfo.message.includes('insufficient funds')) {
      console.error('Wallet has insufficient funds for gas')
    } else if (errorInfo.message.includes('nonce')) {
      console.error('Nonce mismatch - possible pending transaction')
    } else if (errorInfo.message.includes('replacement fee too low')) {
      console.error('Gas price too low to replace existing transaction')
    }
    
    this.emit('transactionFailed', errorInfo)
  }

  /**
   * Get information about a token
   */
  async getTokenInfo(tokenId: number) {
    try {
      const info = await this.contract.getTokenInfo(tokenId)
      return {
        artist: info[0],
        maxSupply: Number(info[1]),
        currentSupply: Number(info[2]),
        royaltyPercentage: Number(info[3]),
        metadataURI: info[4]
      }
    } catch (error) {
      console.error('Error getting token info:', error)
      throw error
    }
  }

  /**
   * Check if the service wallet is the contract owner
   */
  async isContractOwner(): Promise<boolean> {
    try {
      const owner = await this.contract.owner()
      return owner.toLowerCase() === this.wallet.address.toLowerCase()
    } catch (error) {
      console.error('Error checking contract ownership:', error)
      return false
    }
  }

  /**
   * Get the wallet address used by this service
   */
  getWalletAddress(): string {
    return this.wallet.address
  }
}

/**
 * Gas estimation helper
 */
class GasEstimator {
  constructor(private provider: ethers.Provider) {}
  
  async getCurrentGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData()
    return feeData.gasPrice || ethers.parseUnits('10', 'gwei')
  }
  
  async estimateOptimalGas(): Promise<{
    slow: bigint
    standard: bigint
    fast: bigint
  }> {
    const basePrice = await this.getCurrentGasPrice()
    
    return {
      slow: basePrice * 9n / 10n,  // 90% of current
      standard: basePrice,
      fast: basePrice * 12n / 10n  // 120% of current
    }
  }
}

/**
 * Transaction monitoring helper
 */
class TransactionMonitor {
  private pendingTransactions: Map<string, TxStatus> = new Map()
  
  constructor(private provider: ethers.Provider) {}
  
  async monitorTransaction(txHash: string): Promise<TxStatus> {
    const status: TxStatus = {
      hash: txHash,
      status: 'pending',
      confirmations: 0
    }
    
    this.pendingTransactions.set(txHash, status)
    
    try {
      // Wait for transaction to be mined
      const receipt = await this.provider.waitForTransaction(txHash, 1)
      
      if (receipt) {
        status.status = receipt.status === 1 ? 'confirmed' : 'failed'
        status.blockNumber = receipt.blockNumber
        status.gasUsed = receipt.gasUsed
        status.confirmations = 1
        
        if (receipt.status === 0) {
          status.error = 'Transaction reverted'
        }
      }
    } catch (error: any) {
      status.status = 'failed'
      status.error = error.message
    }
    
    this.pendingTransactions.delete(txHash)
    return status
  }
  
  getPendingTransactions(): TxStatus[] {
    return Array.from(this.pendingTransactions.values())
  }
}

// Export a singleton instance
let contractService: ContractService | null = null

export function getContractService(): ContractService {
  if (!contractService) {
    contractService = new ContractService()
  }
  return contractService
}