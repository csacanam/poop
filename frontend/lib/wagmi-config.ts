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

// Define getChainId function
const getChainIdFn = async () => celo.id

// CRITICAL: Add getChainId using Object.defineProperty to make it non-configurable
// This prevents it from being deleted or overwritten
if (originalFarcasterConnector) {
  // @ts-ignore - Farcaster connector doesn't have getChainId in its type definition
  originalFarcasterConnector.getChainId = getChainIdFn
  
  // Also define it as a non-configurable property
  try {
    Object.defineProperty(originalFarcasterConnector, 'getChainId', {
      value: getChainIdFn,
      writable: false,
      configurable: false, // Cannot be deleted
      enumerable: true,
    })
  } catch (e) {
    // If defineProperty fails, the direct assignment above should still work
  }
}

// Wrap with Proxy to intercept ALL access patterns (including internal Wagmi calls)
const farcasterConnector = new Proxy(originalFarcasterConnector, {
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
  getOwnPropertyDescriptor(target, prop) {
    if (prop === 'getChainId') {
      return {
        enumerable: true,
        configurable: false,
        writable: false,
        value: getChainIdFn,
      }
    }
    return Reflect.getOwnPropertyDescriptor(target, prop)
  },
}) as typeof originalFarcasterConnector

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

