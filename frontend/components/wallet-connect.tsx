"use client"

import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Wallet } from "lucide-react"

export function WalletConnect() {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        onClick={() => disconnect()}
        className="font-mono text-sm bg-transparent"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    )
  }

  return (
    <Button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending || !connectors[0]}
      className="gap-2"
    >
      <Wallet className="size-4" />
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  )
}
