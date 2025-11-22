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

// CRITICAL: Always override getChainId IMMEDIATELY after creating connector
// The Farcaster connector doesn't implement getChainId, causing "r.connector.getChainId is not a function" errors
// This must be done BEFORE creating the config and BEFORE Wagmi tries to access it
if (farcasterConnector) {
  // Method 1: Direct assignment (most reliable, done first)
  // @ts-ignore - Workaround for Farcaster connector compatibility
  farcasterConnector.getChainId = async () => {
    return celo.id // Always return Celo Mainnet (42220)
  }
  
  // Method 2: Property descriptor (backup, ensures it can't be deleted)
  try {
    Object.defineProperty(farcasterConnector, 'getChainId', {
      value: async () => celo.id,
      writable: true,
      configurable: true,
      enumerable: true, // Make it enumerable so it shows up in property checks
    })
  } catch (e) {
    // If defineProperty fails, direct assignment above should still work
  }
  
  // Method 3: Ensure it's on the prototype chain as well
  const proto = Object.getPrototypeOf(farcasterConnector)
  if (proto && typeof proto === 'object') {
    try {
      // @ts-ignore
      proto.getChainId = async () => celo.id
    } catch (e) {
      // Ignore if we can't set on prototype
    }
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

