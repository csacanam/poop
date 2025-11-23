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
import { CheckCircle2, Copy, ArrowDownCircle } from "lucide-react"
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
  const [farcasterAddress, setFarcasterAddress] = useState("")
  const { toast } = useToast()
  const { getAccessToken } = usePrivy()

  const handleClaim = async () => {
    if (!farcasterAddress || !farcasterAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Farcaster wallet address",
        variant: "destructive",
      })
      return
    }

    // Basic address validation
    if (!farcasterAddress.startsWith("0x") || farcasterAddress.length !== 42) {
      toast({
        title: "Error",
        description: "Please enter a valid wallet address",
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

      await claimPoop(poopId, farcasterAddress.trim(), accessToken)
      toast({
        title: "Success!",
        description: "Your funds have been claimed and sent to your Farcaster wallet",
      })
      setOpen(false)
      setFarcasterAddress("")
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
        variant="outline"
        className="flex flex-col items-center justify-center h-24 gap-2 w-full"
      >
        <ArrowDownCircle className="size-5" />
        <span className="text-xs">Retirar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Withdraw to Farcaster</DialogTitle>
            <DialogDescription>
              Follow these steps to get your Farcaster wallet address and withdraw your funds
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
                  <p className="text-sm font-medium text-foreground">Copy your Farcaster wallet address</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  6
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Paste address below</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farcaster-address">Your Farcaster Wallet Address</Label>
                <Input
                  id="farcaster-address"
                  placeholder="0x..."
                  value={farcasterAddress}
                  onChange={(e) => setFarcasterAddress(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the wallet address you copied from Farcaster
                </p>
              </div>

              <Button
                onClick={handleClaim}
                disabled={isClaiming || !farcasterAddress.trim()}
                className="w-full"
                size="lg"
              >
                {isClaiming ? (
                  <>
                    <PoopLoader size="sm" className="mr-2" />
                    Processing claim...
                  </>
                ) : (
                  "Withdraw to Farcaster Wallet"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

