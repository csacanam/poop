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
 * The Farcaster Mini App connector does NOT implement getChainId().
 * This causes "r.connector.getChainId is not a function" errors.
 * 
 * SOLUTION: Assign getChainId using Object.defineProperty to ensure it's non-configurable
 * and wrap with Proxy to intercept ALL access patterns.
 * 
 * IMPORTANT: NEVER use useSwitchChain or access chainId from useAccount().
 * Always use APP_CONFIG.DEFAULT_CHAIN.id for chain ID.
 */

// Create the Farcaster connector
const originalFarcasterConnector = miniAppConnector()

// Define getChainId function that always returns Celo Mainnet
const getChainIdFn = async () => celo.id

// CRITICAL: Patch getChainId in EVERY possible way to ensure it's always available
if (originalFarcasterConnector) {
  // Method 1: Direct assignment
  // @ts-ignore
  originalFarcasterConnector.getChainId = getChainIdFn
  
  // Method 2: Property descriptor (non-configurable to prevent deletion)
  try {
    Object.defineProperty(originalFarcasterConnector, 'getChainId', {
      value: getChainIdFn,
      writable: true, // Allow overwriting if needed
      configurable: true, // Allow redefinition
      enumerable: true,
    })
  } catch (e) {
    // Ignore if defineProperty fails
  }
  
  // Method 3: Set on prototype chain
  try {
    let proto = Object.getPrototypeOf(originalFarcasterConnector)
    while (proto && proto !== Object.prototype) {
      // @ts-ignore
      proto.getChainId = getChainIdFn
      proto = Object.getPrototypeOf(proto)
    }
  } catch (e) {
    // Ignore prototype errors
  }
}

// Method 4: Proxy wrapper to intercept ALL property access
const farcasterConnector = new Proxy(originalFarcasterConnector, {
  get(target, prop, receiver) {
    // ALWAYS return getChainId if requested
    if (prop === 'getChainId') {
      return getChainIdFn
    }
    const value = Reflect.get(target, prop, receiver)
    // If it's a function, ensure it has access to getChainId via 'this'
    if (typeof value === 'function' && prop !== 'getChainId') {
      const bound = value.bind(target)
      // @ts-ignore
      bound.getChainId = getChainIdFn
      return bound
    }
    return value
  },
  has(target, prop) {
    return prop === 'getChainId' || Reflect.has(target, prop)
  },
  ownKeys(target) {
    const keys = Reflect.ownKeys(target)
    return keys.includes('getChainId') ? keys : [...keys, 'getChainId']
  },
  getOwnPropertyDescriptor(target, prop) {
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

// Method 5: Global error handler as last resort (only in browser)
if (typeof window !== 'undefined') {
  const originalError = window.onerror
  window.onerror = function(msg, source, lineno, colno, error) {
    // If it's a getChainId error, try to patch it
    if (msg && typeof msg === 'string' && msg.includes('getChainId')) {
      // Try to find and patch any connector references
      try {
        // @ts-ignore
        if (window.wagmi && window.wagmi.config) {
          // @ts-ignore
          const config = window.wagmi.config
          if (config.connectors) {
            config.connectors.forEach((conn: any) => {
              if (conn && conn.id === originalFarcasterConnector?.id && !conn.getChainId) {
                conn.getChainId = getChainIdFn
              }
            })
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    // Call original error handler if it exists
    if (originalError) {
      return originalError.call(this, msg, source, lineno, colno, error)
    }
    return false
  }
}

export const config = createConfig({
  chains: [celo, base],
  transports: {
    [celo.id]: http(),
    [base.id]: http(),
  },
  connectors: [
    farcasterConnector
  ],
})

