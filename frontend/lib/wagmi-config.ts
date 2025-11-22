import { http, createConfig } from 'wagmi'
import { base, celo } from 'wagmi/chains'
import { defineChain } from 'viem/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { APP_CONFIG } from '@/blockchain/config'

// Define Celo Sepolia chain (not included in wagmi/chains by default)
const celoSepolia = defineChain({
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
})

export const config = createConfig({
  chains: [celoSepolia, celo, base],
  transports: {
    [celoSepolia.id]: http(),
    [celo.id]: http(),
    [base.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ],
})

