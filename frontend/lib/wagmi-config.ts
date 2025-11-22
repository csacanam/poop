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

// CRITICAL: Farcaster connector doesn't implement getChainId, causing "r.connector.getChainId is not a function" errors
// We MUST create a wrapper that ALWAYS provides getChainId BEFORE creating the connector
// This is a workaround for Farcaster Mini App connector compatibility

// Define getChainId function that always returns Celo Mainnet (42220)
const getChainIdFn = async () => celo.id

// Create the original connector
const originalFarcasterConnector = miniAppConnector()

// IMMEDIATELY patch the connector with getChainId using ALL possible methods
if (originalFarcasterConnector) {
  // Method 1: Direct assignment (most reliable, done first)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  originalFarcasterConnector.getChainId = getChainIdFn
  
  // Method 2: Property descriptor (ensures it persists and is enumerable)
  try {
    Object.defineProperty(originalFarcasterConnector, 'getChainId', {
      value: getChainIdFn,
      writable: true,
      configurable: true,
      enumerable: true,
    })
  } catch (e) {
    // If defineProperty fails, direct assignment above should still work
  }
  
  // Method 3: Set on prototype chain (for deep property access)
  try {
    const proto = Object.getPrototypeOf(originalFarcasterConnector)
    if (proto && typeof proto === 'object') {
      // @ts-ignore
      proto.getChainId = getChainIdFn
    }
  } catch (e) {
    // Ignore if we can't set on prototype
  }
}

// Method 4: Create a Proxy wrapper that ALWAYS intercepts getChainId calls
// This is the most robust method - it ensures getChainId is ALWAYS available
// regardless of how Wagmi or any other code accesses the connector
const farcasterConnector = new Proxy(originalFarcasterConnector, {
  get(target, prop, receiver) {
    // CRITICAL: Always return getChainId function if requested, regardless of how it's accessed
    if (prop === 'getChainId') {
      return getChainIdFn
    }
    // For all other properties, return from original connector
    const value = Reflect.get(target, prop, receiver)
    // If the value is a function that might access getChainId, wrap it
    if (typeof value === 'function' && prop !== 'getChainId') {
      return value.bind(target)
    }
    return value
  },
  has(target, prop) {
    // Always return true for getChainId
    if (prop === 'getChainId') {
      return true
    }
    return Reflect.has(target, prop)
  },
  ownKeys(target) {
    // Include getChainId in ownKeys so it shows up in property enumeration
    const keys = Reflect.ownKeys(target)
    if (!keys.includes('getChainId')) {
      return [...keys, 'getChainId']
    }
    return keys
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
    return Reflect.getOwnPropertyDescriptor(target, prop)
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

