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

// CRITICAL: Always override getChainId to prevent errors (workaround for Farcaster connector)
// The Farcaster connector doesn't implement getChainId, so we provide a default
// This must be done before creating the config to ensure it's available when Wagmi needs it
if (farcasterConnector) {
  // Multiple approaches to ensure getChainId is always available
  
  // 1. Define as non-enumerable property (primary method)
  Object.defineProperty(farcasterConnector, 'getChainId', {
    value: async () => celo.id, // Default to Celo Mainnet (42220)
    writable: false,
    configurable: false,
    enumerable: false,
  })
  
  // 2. Also set directly as a property (backup method)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  farcasterConnector.getChainId = async () => celo.id
  
  // 3. Wrap the connector in a proxy to intercept any getChainId calls
  // This ensures it's always available even if accessed in unexpected ways
  const originalConnector = farcasterConnector
  const proxiedConnector = new Proxy(originalConnector, {
    get(target, prop) {
      if (prop === 'getChainId') {
        return async () => celo.id
      }
      return Reflect.get(target, prop)
    },
  })
  
  // Use the proxied connector instead
  Object.assign(farcasterConnector, proxiedConnector)
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

