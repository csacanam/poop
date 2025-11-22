"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface WalletContextType {
  isConnected: boolean
  address: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)

  const connectWallet = async () => {
    // Mock wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsConnected(true)
    setAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress(null)
  }

  return (
    <WalletContext.Provider value={{ isConnected, address, connectWallet, disconnectWallet }}>
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
