"use client"

import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { mockGift } from "@/lib/mock-data"
import { CheckCircle2 } from "lucide-react"
import { PoopLoader } from "@/components/ui/poop-loader"
import Link from "next/link"

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <ClaimPageClient id={id} />
}

function ClaimPageClient({ id }: { id: string }) {
  const [status, setStatus] = useState<"pending" | "verifying" | "claiming" | "claimed">("pending")
  const [walletAddress, setWalletAddress] = useState<string>()

  const handleVerifyHumanity = async () => {
    setStatus("verifying")
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setStatus("claiming")
  }

  const handleClaim = async () => {
    // Mock wallet connection and claim
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    setWalletAddress(mockAddress)
    setStatus("claimed")
  }

  // Auto-claim after verification
  if (status === "claiming" && !walletAddress) {
    handleClaim()
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(mockGift.amount)

  const formattedFiat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: mockGift.fiatCurrency,
  }).format(mockGift.fiatValue)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <span className="text-3xl">💩</span>
            <div className="text-left">
              <span className="text-xl font-bold block">POOP</span>
              <span className="text-[10px] text-muted-foreground leading-none">Proof of Onboarding Protocol</span>
            </div>
          </Link>
        </div>

        <Card className="p-8 border-border">
          {status === "pending" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💩</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;ve been onboarded!</h1>
                <p className="text-sm text-muted-foreground mb-2">(Proof of Onboarding Protocol)</p>
                <p className="text-muted-foreground">By {mockGift.senderName}</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center space-y-2">
                <div className="text-4xl">{mockGift.tokenIcon}</div>
                <div className="text-3xl font-bold text-foreground">
                  {formattedAmount} {mockGift.token}
                </div>
                <div className="text-lg text-muted-foreground">{formattedFiat}</div>
              </div>

              {mockGift.message && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-foreground">&ldquo;{mockGift.message}&rdquo;</p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-center">Prove you&apos;re human</h3>
                <p className="text-sm text-muted-foreground text-center">
                  This prevents farming and ensures real onboarding
                </p>
                <Button onClick={handleVerifyHumanity} size="lg" className="w-full gap-2">
                  <CheckCircle2 className="size-4" />
                  Verify Humanity
                </Button>
              </div>
            </div>
          )}

          {(status === "verifying" || status === "claiming") && (
            <div className="py-8 flex flex-col items-center gap-4">
              <PoopLoader size="lg" />
              <h2 className="text-xl font-semibold text-foreground">
                {status === "verifying" ? "Verifying..." : "Processing claim..."}
              </h2>
              <p className="text-muted-foreground text-center">
                {status === "verifying" ? "Checking your humanity" : "Connecting wallet and transferring funds"}
              </p>
            </div>
          )}

          {status === "claimed" && (
            <div className="space-y-6 text-center">
              <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8 text-primary" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re verified!</h2>
                <p className="text-muted-foreground mb-1">Welcome to crypto.</p>
                <p className="text-sm text-muted-foreground">Your onboarding is complete.</p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground mb-2">
                  {formattedAmount} {mockGift.token} transferred
                </div>
                {walletAddress && (
                  <div className="font-mono text-xs text-foreground">
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  </div>
                )}
              </div>

              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Explore POOP
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          POOP — Real humans. Real onboarding. Real growth.
        </p>
      </div>
    </div>
  )
}
