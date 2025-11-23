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
 * SOLUTION: Simply assign getChainId directly to the connector.
 * 
 * IMPORTANT: NEVER use useSwitchChain or access chainId from useAccount().
 * Always use APP_CONFIG.DEFAULT_CHAIN.id for chain ID.
 */

// Create the Farcaster connector
const farcasterConnector = miniAppConnector()

// CRITICAL: Add getChainId method directly to the connector
// This is the simplest and most reliable solution
if (farcasterConnector) {
  // @ts-ignore - Farcaster connector doesn't have getChainId in its type definition
  farcasterConnector.getChainId = async () => celo.id
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

