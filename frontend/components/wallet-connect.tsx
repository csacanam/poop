"use client"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"
import { Wallet } from "lucide-react"

export function WalletConnect() {
  const { isConnected, address, connectWallet, disconnectWallet } = useWallet()

  if (isConnected && address) {
    return (
      <Button variant="outline" onClick={disconnectWallet} className="font-mono text-sm bg-transparent">
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    )
  }

  return (
    <Button onClick={connectWallet} className="gap-2">
      <Wallet className="size-4" />
      Connect Wallet
    </Button>
  )
}
