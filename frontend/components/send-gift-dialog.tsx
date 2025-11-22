"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check } from "lucide-react"
import { PoopLoader } from "@/components/ui/poop-loader"
import { useToast } from "@/hooks/use-toast"

interface SendGiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedToken?: string
}

export function SendGiftDialog({ open, onOpenChange }: SendGiftDialogProps) {
  const [step, setStep] = useState<"details" | "confirm" | "sending" | "success">("details")
  const [friendName, setFriendName] = useState("")
  const [amount, setAmount] = useState("")
  const [claimLink, setClaimLink] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

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
    setFriendName("")
    setAmount("")
    setClaimLink("")
    setCopied(false)
    onOpenChange(false)
  }

  const isFormValid = friendName && amount && Number.parseFloat(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">💩</span>
            Start Your First POOP
          </DialogTitle>
          <DialogDescription>Bring someone into crypto — one POOP at a time.</DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Friend&apos;s Name</Label>
              <Input
                id="name"
                placeholder="Maria Silva"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
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
              <p className="text-xs text-muted-foreground">Available: $245.50 USDC</p>
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
                <span className="text-sm text-muted-foreground">Person You&apos;re Onboarding</span>
                <span className="font-semibold break-words">{friendName}</span>
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
                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-xl">💩</div>
                <div>
                  <p className="font-semibold text-foreground">POOP created successfully</p>
                  <p className="text-sm text-muted-foreground">
                    ${amount} USDC for {friendName}
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
                Share this link with {friendName} to bring them into crypto
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
