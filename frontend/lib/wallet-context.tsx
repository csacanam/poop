"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"

interface WalletContextType {
  isConnected: boolean
  address: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const connectWallet = async () => {
    // Connect to the first connector (Farcaster Mini App connector)
    if (connectors[0]) {
      connect({ connector: connectors[0] })
    }
  }

  const disconnectWallet = () => {
    disconnect()
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address || null,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
