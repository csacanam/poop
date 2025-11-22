import { http, createConfig } from 'wagmi'
import { base, celo } from 'wagmi/chains'
import { type Chain } from 'viem'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { APP_CONFIG } from '@/blockchain/config'

// Define Celo Sepolia chain (not included in wagmi/chains by default)
const celoSepolia: Chain = {
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Celo',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: [APP_CONFIG.RPC_ENDPOINTS.CELO_SEPOLIA],
    },
  },
  blockExplorers: {
    default: {
      name: 'CeloScan Sepolia',
      url: 'https://sepolia.celoscan.io',
    },
  },
  testnet: true,
} as const satisfies Chain

/**
 * CRITICAL: Farcaster Mini App Connector Workaround
 * 
 * The Farcaster Mini App connector (@farcaster/miniapp-wagmi-connector) does NOT implement
 * the `getChainId()` method that Wagmi expects. This causes "r.connector.getChainId is not a function"
 * errors when using hooks like useWriteContract, useSwitchChain, etc.
 * 
 * SOLUTION: Create a complete wrapper that implements getChainId and forwards all other methods.
 * This wrapper MUST be used instead of the original connector to prevent errors.
 * 
 * IMPORTANT: NEVER use the original connector directly. Always use the wrapped version.
 * NEVER use useSwitchChain or access chainId from useAccount() with Farcaster connector.
 * Always use APP_CONFIG.DEFAULT_CHAIN.id for chain ID instead.
 */

// Create the original Farcaster connector
const originalFarcasterConnector = miniAppConnector()

// Define getChainId function that always returns Celo Mainnet (42220)
// This is the default chain for Farcaster Mini Apps
const getChainIdFn = async () => celo.id

// Create a complete wrapper class that implements getChainId and forwards all other methods
class FarcasterConnectorWrapper {
  private connector: typeof originalFarcasterConnector

  constructor(connector: typeof originalFarcasterConnector) {
    this.connector = connector
  }

  // CRITICAL: Implement getChainId - this is what Wagmi needs
  async getChainId(): Promise<number> {
    return celo.id
  }

  // Forward all other properties and methods to the original connector
  // Use Proxy-like behavior to ensure all access goes through this wrapper
  get id() {
    return this.connector.id
  }

  get name() {
    return this.connector.name
  }

  get type() {
    return this.connector.type
  }

  get icon() {
    return this.connector.icon
  }

  // Forward all methods
  connect(...args: any[]) {
    return (this.connector as any).connect(...args)
  }

  disconnect(...args: any[]) {
    return (this.connector as any).disconnect(...args)
  }

  getAccounts(...args: any[]) {
    return (this.connector as any).getAccounts(...args)
  }

  getChainId(...args: any[]) {
    // This method might exist but we override it
    return getChainIdFn()
  }

  isAuthorized(...args: any[]) {
    return (this.connector as any).isAuthorized(...args)
  }

  switchChain(...args: any[]) {
    return (this.connector as any).switchChain(...args)
  }

  watchAsset(...args: any[]) {
    return (this.connector as any).watchAsset(...args)
  }

  // Use Proxy to catch any other property access
  [key: string]: any
}

// Create the wrapped connector
const farcasterConnectorWrapper = new FarcasterConnectorWrapper(originalFarcasterConnector)

// ALSO create a Proxy as a backup to catch any direct property access
// This ensures getChainId is available even if accessed directly
const farcasterConnector = new Proxy(farcasterConnectorWrapper, {
  get(target, prop) {
    // CRITICAL: Always return getChainId function if requested
    if (prop === 'getChainId') {
      return getChainIdFn
    }
    // For all other properties, try the wrapper first, then the original connector
    if (prop in target) {
      const value = (target as any)[prop]
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    }
    // Fallback to original connector for any other properties
    return Reflect.get((target as any).connector, prop)
  },
  has(target, prop) {
    // Always return true for getChainId
    if (prop === 'getChainId') {
      return true
    }
    // Check wrapper first, then original connector
    return prop in target || Reflect.has((target as any).connector, prop)
  },
  ownKeys(target) {
    // Include getChainId and all wrapper properties
    const wrapperKeys = Reflect.ownKeys(target)
    const connectorKeys = Reflect.ownKeys((target as any).connector)
    const allKeys = new Set([...wrapperKeys, ...connectorKeys, 'getChainId'])
    return Array.from(allKeys)
  },
  getOwnPropertyDescriptor(target, prop) {
    // Ensure getChainId has a property descriptor
    if (prop === 'getChainId') {
      return {
        enumerable: true,
        configurable: true,
        writable: true,
        value: getChainIdFn,
      }
    }
    // Try wrapper first
    if (prop in target) {
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }
    // Fallback to original connector
    return Reflect.getOwnPropertyDescriptor((target as any).connector, prop)
  },
}) as typeof originalFarcasterConnector

export const config = createConfig({
  // Farcaster only supports mainnets (Celo and Base), not testnets like Celo Sepolia
  // Put supported chains first
  chains: [celo, base],
  transports: {
    [celo.id]: http(),
    [base.id]: http(),
  },
  connectors: [
    farcasterConnector
  ],
})

