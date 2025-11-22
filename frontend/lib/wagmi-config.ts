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

// Always override getChainId to prevent errors (workaround for Farcaster connector)
// The Farcaster connector doesn't implement getChainId, so we provide a default
// This must be done before creating the config to ensure it's available when Wagmi needs it
if (farcasterConnector) {
  // @ts-ignore - Workaround for Farcaster connector compatibility
  Object.defineProperty(farcasterConnector, 'getChainId', {
    value: async () => celo.id, // Default to Celo Mainnet (42220)
    writable: false,
    configurable: false,
  })
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

