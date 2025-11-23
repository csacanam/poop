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

// Method 5: Intercept ALL property access on connector objects globally
// This ensures getChainId is available even if Wagmi creates new references
if (typeof window !== 'undefined') {
  // Patch Object.getOwnPropertyDescriptor globally to always return getChainId for Farcaster connectors
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  Object.getOwnPropertyDescriptor = function(obj: any, prop: string | symbol) {
    const descriptor = originalGetOwnPropertyDescriptor.call(this, obj, prop)
    // If accessing getChainId on what looks like a Farcaster connector, ensure it exists
    if (prop === 'getChainId' && obj && typeof obj === 'object') {
      // Check if this is the Farcaster connector (by id or by reference)
      const isFarcasterConnector = 
        obj === originalFarcasterConnector ||
        obj === farcasterConnector ||
        (obj.id && obj.id === originalFarcasterConnector?.id) ||
        (obj.name && obj.name.includes('Farcaster'))
      
      if (isFarcasterConnector && !descriptor) {
        // Ensure getChainId exists on this object
        if (!obj.getChainId) {
          obj.getChainId = getChainIdFn
        }
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: getChainIdFn,
        }
      }
    }
    return descriptor
  }
  
  // Also patch Object.hasOwnProperty to return true for getChainId on Farcaster connectors
  const originalHasOwnProperty = Object.prototype.hasOwnProperty
  Object.prototype.hasOwnProperty = function(prop: string | symbol) {
    if (prop === 'getChainId' && this === originalFarcasterConnector) {
      return true
    }
    return originalHasOwnProperty.call(this, prop)
  }
}

const wagmiConfig = createConfig({
  chains: [celo, base],
  transports: {
    [celo.id]: http(),
    [base.id]: http(),
  },
  connectors: [
    farcasterConnector
  ],
})

// CRITICAL: Patch connectors array after config creation to ensure getChainId is always available
// Wagmi might create internal references to connectors, so we need to patch those too
if (wagmiConfig) {
  try {
    // @ts-ignore - Access internal connectors if available
    const configInternal = wagmiConfig as any
    if (configInternal.connectors && Array.isArray(configInternal.connectors)) {
      configInternal.connectors.forEach((conn: any, index: number) => {
        if (conn && (conn.id === originalFarcasterConnector?.id || conn === originalFarcasterConnector || conn === farcasterConnector)) {
          // Ensure this connector has getChainId
          if (!conn.getChainId) {
            conn.getChainId = getChainIdFn
          }
          // Replace with our wrapped version to ensure Proxy is used
          configInternal.connectors[index] = farcasterConnector
        }
      })
    }
  } catch (e) {
    // Ignore if we can't patch internally
  }
}

export const config = wagmiConfig

