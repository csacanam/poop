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
 * SOLUTION: Patch the connector with getChainId using multiple methods and wrap with Proxy.
 * This ensures getChainId is ALWAYS available regardless of how Wagmi accesses it.
 * 
 * IMPORTANT: NEVER use useSwitchChain or access chainId from useAccount() with Farcaster connector.
 * Always use APP_CONFIG.DEFAULT_CHAIN.id for chain ID instead.
 * 
 * See: frontend/docs/llm/FARCASTER_CONNECTOR.md for complete documentation.
 */

// Create the original Farcaster connector
const originalFarcasterConnector = miniAppConnector()

// Define getChainId function that always returns Celo Mainnet (42220)
// This is the default chain for Farcaster Mini Apps
const getChainIdFn = async () => celo.id

// CRITICAL: Global interceptor to catch ANY access to getChainId on ANY object
// This is a last-resort safety net in case Wagmi accesses connectors in unexpected ways
if (typeof window !== 'undefined') {
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  Object.getOwnPropertyDescriptor = function(obj: any, prop: string | symbol) {
    const descriptor = originalGetOwnPropertyDescriptor.call(this, obj, prop)
    // If accessing getChainId on what looks like a connector, ensure it exists
    if (prop === 'getChainId' && obj && typeof obj === 'object' && !descriptor) {
      // Check if this looks like the Farcaster connector
      if (obj.id === originalFarcasterConnector?.id || obj === originalFarcasterConnector) {
        return {
          enumerable: true,
          configurable: false,
          writable: false,
          value: getChainIdFn,
        }
      }
    }
    return descriptor
  }
}

// CRITICAL: Patch the connector IMMEDIATELY with getChainId using ALL possible methods
// We must do this BEFORE creating the Proxy to ensure the method exists at all levels
if (originalFarcasterConnector) {
  // Method 1: Direct assignment on the instance (most reliable, done first)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  originalFarcasterConnector.getChainId = getChainIdFn
  
  // Method 2: Property descriptor on the instance (ensures it persists and is enumerable)
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
      
      // Also try setting on prototype's prototype if it exists
      const protoProto = Object.getPrototypeOf(proto)
      if (protoProto && typeof protoProto === 'object') {
        // @ts-ignore
        protoProto.getChainId = getChainIdFn
      }
    }
  } catch (e) {
    // Ignore if we can't set on prototype
  }
  
  // Method 4: Freeze the getChainId property to prevent it from being deleted
  try {
    const descriptor = Object.getOwnPropertyDescriptor(originalFarcasterConnector, 'getChainId')
    if (descriptor) {
      Object.defineProperty(originalFarcasterConnector, 'getChainId', {
        ...descriptor,
        configurable: false, // Prevent deletion
        writable: false, // Prevent overwriting
      })
    }
  } catch (e) {
    // Ignore if we can't freeze
  }
}

// Method 5: Create a Proxy wrapper that ALWAYS intercepts getChainId calls
// This is the most robust method - it ensures getChainId is ALWAYS available
// regardless of how Wagmi or any other code accesses the connector
// The Proxy intercepts ALL property access, including internal Wagmi calls
const farcasterConnector = new Proxy(originalFarcasterConnector, {
  get(target, prop, receiver) {
    // CRITICAL: Always return getChainId function if requested, regardless of how it's accessed
    // This intercepts ALL access patterns: direct access, Reflect.get, Object.getOwnPropertyDescriptor, etc.
    if (prop === 'getChainId' || prop === Symbol.for('getChainId')) {
      return getChainIdFn
    }
    
    // For all other properties, get from target
    const value = Reflect.get(target, prop, receiver)
    
    // If the value is a function, bind it to maintain 'this' context
    if (typeof value === 'function' && prop !== 'getChainId') {
      // Special handling: if this function might internally call getChainId, ensure it has access
      const boundFn = value.bind(target)
      // Also attach getChainId to the bound function in case it's accessed via 'this'
      if (prop === 'connect' || prop === 'switchChain' || prop === 'getAccounts') {
        // @ts-ignore
        boundFn.getChainId = getChainIdFn
      }
      return boundFn
    }
    
    return value
  },
  has(target, prop) {
    // Always return true for getChainId
    if (prop === 'getChainId' || prop === Symbol.for('getChainId')) {
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
    // This is critical - Wagmi uses this to check if the property exists
    if (prop === 'getChainId' || prop === Symbol.for('getChainId')) {
      return {
        enumerable: true,
        configurable: false, // Prevent deletion
        writable: false, // Prevent overwriting
        value: getChainIdFn,
      }
    }
    const descriptor = Reflect.getOwnPropertyDescriptor(target, prop)
    return descriptor
  },
  defineProperty(target, prop, descriptor) {
    // Prevent overwriting getChainId
    if (prop === 'getChainId') {
      return false // Reject attempts to redefine
    }
    return Reflect.defineProperty(target, prop, descriptor)
  },
  deleteProperty(target, prop) {
    // Prevent deletion of getChainId
    if (prop === 'getChainId') {
      return false // Reject deletion
    }
    return Reflect.deleteProperty(target, prop)
  },
}) as typeof originalFarcasterConnector

// Create the config with the wrapped connector
const wagmiConfig = createConfig({
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

// CRITICAL: Intercept any internal Wagmi access to connectors
// This ensures that even if Wagmi accesses connectors internally, getChainId is always available
// We wrap the config's internal connector access if possible
if (typeof wagmiConfig !== 'undefined' && wagmiConfig) {
  // Try to patch any internal connector references
  try {
    // Access the internal connectors array if it exists
    const configInternal = wagmiConfig as any
    if (configInternal.connectors && Array.isArray(configInternal.connectors)) {
      configInternal.connectors = configInternal.connectors.map((conn: any) => {
        if (conn && conn.id === farcasterConnector.id) {
          // Ensure this connector has getChainId
          if (!conn.getChainId) {
            conn.getChainId = getChainIdFn
          }
          return farcasterConnector // Always return our wrapped version
        }
        return conn
      })
    }
  } catch (e) {
    // If we can't patch internally, the Proxy should still work
    console.warn('[wagmi-config] Could not patch internal connector references, relying on Proxy')
  }
}

export const config = wagmiConfig

