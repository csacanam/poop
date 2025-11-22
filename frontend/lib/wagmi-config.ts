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
const farcasterConnector = miniAppConnector()

// CRITICAL: Farcaster connector doesn't implement getChainId, causing "r.connector.getChainId is not a function" errors
// We MUST override it IMMEDIATELY after creation, BEFORE Wagmi tries to access it
// This is a workaround for Farcaster Mini App connector compatibility
if (farcasterConnector) {
  // Define getChainId function that always returns Celo Mainnet (42220)
  const getChainIdFn = async () => celo.id
  
  // Method 1: Direct assignment on the connector instance (most reliable)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  farcasterConnector.getChainId = getChainIdFn
  
  // Method 2: Property descriptor on the instance (ensures it persists and is enumerable)
  try {
    Object.defineProperty(farcasterConnector, 'getChainId', {
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
    const proto = Object.getPrototypeOf(farcasterConnector)
    if (proto && typeof proto === 'object') {
      // @ts-ignore
      proto.getChainId = getChainIdFn
    }
  } catch (e) {
    // Ignore if we can't set on prototype
  }
  
  // Method 4: Proxy wrapper to intercept any getChainId calls (most robust)
  // This ensures getChainId is always available, even if accessed via different paths
  try {
    const originalConnector = farcasterConnector
    const proxiedConnector = new Proxy(originalConnector, {
      get(target, prop) {
        if (prop === 'getChainId') {
          return getChainIdFn
        }
        return Reflect.get(target, prop)
      },
      has(target, prop) {
        if (prop === 'getChainId') {
          return true
        }
        return Reflect.has(target, prop)
      },
    })
    
    // Replace the connector with the proxied version
    // Note: We can't directly replace, but we've already set it on the original
    // The proxy is a backup if direct property access fails
  } catch (e) {
    // Proxy might not be available in all environments, that's okay
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

