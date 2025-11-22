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

// Create connector with error handling for getChainId
const originalFarcasterConnector = miniAppConnector()

// CRITICAL: Farcaster connector doesn't implement getChainId, causing "r.connector.getChainId is not a function" errors
// We MUST override it IMMEDIATELY after creation, BEFORE Wagmi tries to access it
// This is a workaround for Farcaster Mini App connector compatibility
let farcasterConnector = originalFarcasterConnector

if (originalFarcasterConnector) {
  // Define getChainId function that always returns Celo Mainnet (42220)
  const getChainIdFn = async () => celo.id
  
  // Method 1: Direct assignment on the connector instance (most reliable)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  originalFarcasterConnector.getChainId = getChainIdFn
  
  // Method 2: Property descriptor on the instance (ensures it persists and is enumerable)
  try {
    Object.defineProperty(originalFarcasterConnector, 'getChainId', {
      value: getChainIdFn,
      writable: true,
      configurable: true,
      enumerable: true, // Make it enumerable so it shows up in property checks
    })
  } catch (e) {
    // If defineProperty fails, direct assignment above should still work
    console.warn('[wagmi-config] Failed to define getChainId property, using direct assignment')
  }
  
  // Method 3: Set on prototype chain as well (for deep property access)
  try {
    const proto = Object.getPrototypeOf(originalFarcasterConnector)
    if (proto && typeof proto === 'object') {
      // @ts-ignore
      proto.getChainId = getChainIdFn
    }
  } catch (e) {
    // Ignore if we can't set on prototype
  }
  
  // Method 4: Proxy wrapper to intercept ANY getChainId calls (most robust)
  // This ensures getChainId is always available, even if accessed via different paths
  // We use the proxy as the final connector to ensure all access paths are covered
  try {
    farcasterConnector = new Proxy(originalFarcasterConnector, {
      get(target, prop) {
        // Always return getChainId function if requested
        if (prop === 'getChainId') {
          return getChainIdFn
        }
        // For all other properties, return from original connector
        return Reflect.get(target, prop)
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
    }) as typeof originalFarcasterConnector
  } catch (e) {
    // Proxy might not be available in all environments, fallback to original
    console.warn('[wagmi-config] Proxy not available, using direct assignment only')
    farcasterConnector = originalFarcasterConnector
  }
}

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

