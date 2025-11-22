"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check } from "lucide-react"
import { PoopLoader } from "@/components/ui/poop-loader"
import { useToast } from "@/hooks/use-toast"
import { useUSDCBalance } from "@/hooks/use-usdc-balance"

interface SendGiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedToken?: string
}

export function SendGiftDialog({ open, onOpenChange }: SendGiftDialogProps) {
  const [step, setStep] = useState<"details" | "confirm" | "sending" | "success">("details")
  const [friendEmail, setFriendEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [claimLink, setClaimLink] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance()

  const handleSend = async () => {
    setStep("sending")

    // Mock sending transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const link = `${window.location.origin}/claim/txn_${Date.now()}`
    setClaimLink(link)
    setStep("success")
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(claimLink)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Share this link to onboard someone new",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setStep("details")
    setFriendEmail("")
    setAmount("")
    setClaimLink("")
    setCopied(false)
    onOpenChange(false)
  }

  const isEmailValid = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const isFormValid = friendEmail && isEmailValid(friendEmail) && amount && Number.parseFloat(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">💩</span>
            Start Your First POOP
          </DialogTitle>
          <DialogDescription className="text-left">Bring someone into crypto — one POOP at a time.</DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Friend&apos;s Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-7"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Available: {isLoadingBalance ? "Loading..." : `$${new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(usdcBalance)} USDC`}
              </p>
            </div>

            <Button onClick={() => setStep("confirm")} className="w-full" disabled={!isFormValid}>
              Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Friend&apos;s Email</span>
                <span className="font-semibold break-words">{friendEmail}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">${amount} USDC</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1 bg-transparent">
                Back
              </Button>
              <Button onClick={handleSend} className="flex-1">
                Create POOP
              </Button>
            </div>
          </div>
        )}

        {step === "sending" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <PoopLoader size="lg" />
            <p className="text-muted-foreground">Creating your POOP...</p>
          </div>
        )}

          {step === "success" && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💩</span>
                  <div>
                    <p className="font-semibold text-foreground">POOP created successfully</p>
                    <p className="text-sm text-muted-foreground">
                      ${amount} USDC for {friendEmail}
                    </p>
                  </div>
                </div>
              </div>

            <div className="space-y-2">
              <Label>Claim Link</Label>
              <div className="flex gap-2">
                <Input value={claimLink} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0 bg-transparent">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with {friendEmail} to bring them into crypto
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
