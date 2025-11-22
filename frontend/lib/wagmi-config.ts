import { http, createConfig } from 'wagmi'
import { base, celo } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base, celo],
  transports: {
    [base.id]: http(),
    [celo.id]: http(),
  },
  connectors: [
    miniAppConnector()
  ],
})

