"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, Check, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "wagmi"
import { createPoop } from "@/lib/api-client"
import { useDepositPoop } from "@/hooks/use-deposit-poop"
import { useApproveUSDC } from "@/hooks/use-approve-usdc"
import { formatUnits, parseUnits } from "viem"
import { getTokenDecimals, APP_CONFIG } from "@/blockchain/config"

interface SendGiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedToken?: string
}

export function SendGiftDialog({ open, onOpenChange }: SendGiftDialogProps) {
  const [step, setStep] = useState<"details" | "confirm" | "creating" | "approving" | "funding" | "success">("details")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [poopId, setPoopId] = useState<string | null>(null)
  const [claimLink, setClaimLink] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { address } = useAccount()
  const { deposit, hash, isPending: isDepositing, isSuccess: isDepositSuccess, error: depositError } = useDepositPoop()
  
  // Get chain config for approval
  const chainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
  const chainName = chainId === 11142220 ? 'CELO_SEPOLIA' : chainId === 42220 ? 'CELO' : 'CELO'
  const usdcDecimals = getTokenDecimals('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')
  
  const { 
    approve, 
    allowance, 
    isPending: isApproving, 
    isApproved, 
    needsApproval 
  } = useApproveUSDC()

  const handleCreatePoop = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setStep("creating")

    try {
      const numericAmount = Number.parseFloat(amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Invalid amount")
      }

      // Create POOP in backend
      const result = await createPoop(address, recipientEmail, numericAmount)
      setPoopId(result.id)
      
      // Move to funding step
      setStep("funding")
    } catch (error: any) {
      console.error("Error creating POOP:", error)
      toast({
        title: "Failed to create POOP",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
      setStep("confirm")
    }
  }

  const handleFundPoop = async () => {
    if (!address || !poopId) {
      toast({
        title: "Missing information",
        description: "POOP ID or wallet address not found",
        variant: "destructive",
      })
      return
    }

    try {
      const numericAmount = Number.parseFloat(amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("Invalid amount")
      }

      const amountInWei = parseUnits(numericAmount.toString(), usdcDecimals)
      
      // Check if approval is needed
      if (needsApproval(amountInWei)) {
        setStep("approving")
        approve() // This will trigger the wallet UI for approval (wallet will handle chain switch if needed)
      } else {
        // Call deposit directly if already approved
        deposit({
          amount: numericAmount,
          poopId: poopId,
        })
      }
    } catch (error: any) {
      console.error("Error funding POOP:", error)
      toast({
        title: "Failed to fund POOP",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    }
  }
  
  // Watch for successful approval, then proceed to deposit
  useEffect(() => {
    if (isApproved && step === "approving" && poopId) {
      const numericAmount = Number.parseFloat(amount)
      if (!isNaN(numericAmount) && numericAmount > 0) {
        setStep("funding")
        deposit({
          amount: numericAmount,
          poopId: poopId,
        })
      }
    }
  }, [isApproved, step, poopId, amount, deposit])

  // Watch for successful deposit
  useEffect(() => {
    if (isDepositSuccess && step === "funding" && poopId) {
      const link = `${window.location.origin}/claim/${poopId}`
      setClaimLink(link)
      setStep("success")
    }
  }, [isDepositSuccess, step, poopId])

  // Watch for deposit errors
  useEffect(() => {
    if (depositError && step === "funding") {
      toast({
        title: "Transaction failed",
        description: depositError.message || "The deposit transaction failed",
        variant: "destructive",
      })
    }
  }, [depositError, step, toast])

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
    setRecipientEmail("")
    setAmount("")
    setPoopId(null)
    setClaimLink("")
    setCopied(false)
    onOpenChange(false)
  }

  const isFormValid = recipientEmail && amount && Number.parseFloat(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">💩</span>
            Start Your First POOP
          </DialogTitle>
          <DialogDescription>Onboard someone you care about</DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The recipient will receive an email to claim their POOP
              </p>
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
                  step="0.01"
                  min="0"
                />
              </div>
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
                <span className="text-sm text-muted-foreground">Recipient</span>
                <span className="font-semibold break-words">{recipientEmail}</span>
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
              <Button onClick={handleCreatePoop} className="flex-1">
                Create POOP
              </Button>
            </div>
          </div>
        )}

        {step === "creating" && (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Creating your POOP...</p>
          </div>
        )}

        {step === "approving" && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-xl">💩</div>
                <div>
                  <p className="font-semibold text-foreground">Approve USDC</p>
                  <p className="text-sm text-muted-foreground">
                    First, approve spending ${amount} USDC
                  </p>
                </div>
              </div>
            </div>

            <div className="py-8 flex flex-col items-center gap-4">
              {isApproving ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Waiting for approval...</p>
                </>
              ) : isApproved ? (
                <>
                  <Check className="size-8 text-green-500" />
                  <p className="text-muted-foreground">Approval confirmed!</p>
                </>
              ) : (
                <p className="text-muted-foreground">Please approve the transaction in your wallet</p>
              )}
            </div>
          </div>
        )}

        {step === "funding" && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-xl">💩</div>
                <div>
                  <p className="font-semibold text-foreground">POOP created</p>
                  <p className="text-sm text-muted-foreground">
                    Now fund it with ${amount} USDC
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipient</Label>
              <p className="text-sm font-medium">{recipientEmail}</p>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <p className="text-sm font-medium">${amount} USDC</p>
            </div>

            {hash && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all">{hash}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => window.open(`https://celoscan.io/tx/${hash}`, '_blank')}
                  >
                    <ExternalLink className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            <Button 
              onClick={handleFundPoop} 
              className="w-full" 
              disabled={isDepositing || isDepositSuccess}
            >
              {isDepositing ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Funding POOP...
                </>
              ) : isDepositSuccess ? (
                "Funded!"
              ) : (
                `Fund with $${amount} USDC`
              )}
            </Button>

            {depositError && (
              <p className="text-sm text-destructive text-center">
                {depositError.message || "Transaction failed"}
              </p>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-xl">💩</div>
                <div>
                  <p className="font-semibold text-foreground">POOP funded successfully</p>
                  <p className="text-sm text-muted-foreground">
                    ${amount} USDC for {recipientEmail}
                  </p>
                </div>
              </div>
            </div>

            {hash && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all">{hash}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => window.open(`https://celoscan.io/tx/${hash}`, '_blank')}
                  >
                    <ExternalLink className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Claim Link</Label>
              <div className="flex gap-2">
                <Input value={claimLink} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0 bg-transparent">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the recipient to bring them into crypto
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
