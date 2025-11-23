"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PoopLoader } from "@/components/ui/poop-loader"
import { CheckCircle2, Copy } from "lucide-react"
import { claimPoop } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { APP_CONFIG } from "@/blockchain/config"

interface WithdrawDialogProps {
  poopId: string
  amount: number
  walletAddress: string | null
}

export function WithdrawDialog({ poopId, amount, walletAddress }: WithdrawDialogProps) {
  const [open, setOpen] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { getAccessToken } = usePrivy()

  const celoAddress = APP_CONFIG.DEFAULT_CHAIN.rpcUrl.includes("celo") 
    ? "0x765DE816845861e75A25fCA122bb6898B8B1282a" // USDC on Celo Mainnet
    : ""

  const handleCopy = async () => {
    if (!walletAddress) return
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      })
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleClaim = async () => {
    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Wallet address not found",
        variant: "destructive",
      })
      return
    }

    setIsClaiming(true)
    try {
      // Get Privy access token
      const accessToken = await getAccessToken()
      if (!accessToken) {
        throw new Error("Failed to get authentication token")
      }

      await claimPoop(poopId, walletAddress, accessToken)
      toast({
        title: "Success!",
        description: "Your funds have been claimed",
      })
      setOpen(false)
      // Reload page to update state
      window.location.reload()
    } catch (error: any) {
      console.error("Error claiming POOP:", error)
      toast({
        title: "Failed to claim",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="w-full"
      >
        Retirar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Withdraw Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to withdraw your funds to your Farcaster wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Create account in Farcaster</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Open wallet</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Click on Deposit</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Transfer crypto option</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  5
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-2">Copy your Farcaster wallet address</p>
                  {walletAddress ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 font-mono break-all">
                        {walletAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        className="flex-shrink-0"
                      >
                        {copied ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Wallet address not available</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  6
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Paste address</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  7
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Send</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleClaim}
                disabled={isClaiming || !walletAddress}
                className="w-full"
                size="lg"
              >
                {isClaiming ? (
                  <>
                    <PoopLoader size="sm" className="mr-2" />
                    Processing claim...
                  </>
                ) : (
                  "I've completed the steps above"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

