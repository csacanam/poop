"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Wallet, LogOut, Copy, Check, User } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useUserCheck } from "@/hooks/use-user-check"

export function WalletConnect() {
  const { isConnected, address } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { user } = useUserCheck()
  const username = user?.username

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setCopied(true)
        toast({
          title: "Address copied!",
          description: "Wallet address copied to clipboard",
        })
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Please copy the address manually",
          variant: "destructive",
        })
      }
    }
  }

  if (isConnected && address) {
    // Show username if available, otherwise show wallet address
    const displayText = username || `${address.slice(0, 6)}...${address.slice(-4)}`
    const DisplayIcon = username ? User : Wallet

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`${username ? '' : 'font-mono'} text-sm bg-transparent gap-2`}>
            <DisplayIcon className="size-4" />
            {displayText}
      </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {username && (
            <DropdownMenuItem disabled className="opacity-100">
              <div className="flex flex-col w-full">
                <span className="text-xs text-muted-foreground">Username</span>
                <span className="text-sm mt-1 font-medium">{username}</span>
              </div>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled className="opacity-100">
            <div className="flex flex-col w-full">
              <span className="text-xs text-muted-foreground">Connected Wallet</span>
              <span className="font-mono text-sm mt-1">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
            {copied ? (
              <>
                <Check className="size-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-4 mr-2" />
                Copy Address
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => disconnect()}
            variant="destructive"
            className="cursor-pointer"
          >
            <LogOut className="size-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
