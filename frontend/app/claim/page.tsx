"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, QrCode } from "lucide-react"
import { getRecipientPoops } from "@/lib/api-client"
import { obscureEmail } from "@/lib/utils"
import Link from "next/link"
import { SetupUsernameDialogClaim } from "@/components/setup-username-dialog-claim"

interface PendingPoop {
  id: string
  sender_username: string | null
  recipient_email: string
  amount: number
  chain_id: number
  state: string
  created_at: string
}

export default function ClaimPage() {
  const { ready, authenticated, user, login } = usePrivy()
  const [step, setStep] = useState<"login" | "pending" | "profile" | "verify" | "claiming" | "claimed">("login")
  const [pendingPoops, setPendingPoops] = useState<PendingPoop[]>([])
  const [selectedPoop, setSelectedPoop] = useState<PendingPoop | null>(null)
  const [isLoadingPoops, setIsLoadingPoops] = useState(false)
  const [obscuredEmail, setObscuredEmail] = useState<string>("")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [humanityVerified, setHumanityVerified] = useState(false)
  const [emailFromQuery, setEmailFromQuery] = useState<string>("")

  // Get user email from Privy - Privy stores email in user.email.address or user.linkedAccounts
  const userEmail = user?.email?.address || 
                    user?.linkedAccounts?.find((account: any) => account.type === 'email')?.address || 
                    ""

  // Debug logging
  useEffect(() => {
    console.log("[ClaimPage] Privy state:", {
      ready,
      authenticated,
      user,
      userEmail,
      step,
    })
  }, [ready, authenticated, user, userEmail, step])

  // Get email from URL query parameter (if provided)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const email = params.get("email")
      if (email) {
        setEmailFromQuery(email)
        setObscuredEmail(obscureEmail(email))
      }
    }
  }, [])

  // When user logs in, fetch pending POOPs
  useEffect(() => {
    if (ready && authenticated && userEmail) {
      console.log("[ClaimPage] User logged in, fetching POOPs for email:", userEmail)
      setObscuredEmail(obscureEmail(userEmail))
      fetchPendingPoops()
    } else if (ready && authenticated && !userEmail) {
      console.warn("[ClaimPage] User authenticated but no email found")
    }
  }, [ready, authenticated, userEmail])

  const fetchPendingPoops = async () => {
    if (!userEmail) {
      console.warn("[ClaimPage] Cannot fetch POOPs: no email")
      return
    }

    console.log("[ClaimPage] Fetching POOPs for email:", userEmail)
    setIsLoadingPoops(true)
    try {
      const poops = await getRecipientPoops(userEmail)
      console.log("[ClaimPage] Received POOPs:", poops)
      setPendingPoops(poops)
      if (poops.length > 0) {
        setSelectedPoop(poops[0]) // Select the first (most recent) POOP
        setStep("pending")
        console.log("[ClaimPage] Setting step to 'pending'")
      } else {
        console.log("[ClaimPage] No POOPs found, staying on login step")
        setStep("login") // No POOPs found
      }
    } catch (error: any) {
      console.error("[ClaimPage] Error fetching POOPs:", error)
      setStep("login")
    } finally {
      setIsLoadingPoops(false)
    }
  }

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error("Login error:", error)
    }
  }

  const handleProfileComplete = () => {
    setProfileComplete(true)
    setShowProfileDialog(false)
    // Move to verify step if profile is complete
    if (humanityVerified) {
      setStep("claiming")
    } else {
      setStep("verify")
    }
  }

  const handleVerifyHumanity = () => {
    setHumanityVerified(true)
    // Move to claiming step if profile is also complete
    if (profileComplete) {
      setStep("claiming")
    }
  }

  const handleClaim = async () => {
    if (!selectedPoop) return
    setStep("claiming")
    // TODO: Implement actual claim logic
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setStep("claimed")
  }

  // Check if claim button should be enabled
  const canClaim = profileComplete && humanityVerified && selectedPoop

  const formattedAmount = selectedPoop
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(selectedPoop.amount)
    : "0.00"

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
            </div>
          </Link>
        </div>

        <Card className="p-8 border-border">
          {/* Login Step */}
          {step === "login" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💩</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;ve been onboarded!</h1>
                <p className="text-muted-foreground mb-4">
                  Someone sent you a gift that you can claim for free
                </p>
                {obscuredEmail && (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">
                      You can only claim it by logging in with the email:
                    </p>
                    <p className="text-lg font-semibold text-foreground mb-6">
                      {obscuredEmail}
                    </p>
                  </>
                )}
              </div>

              {!ready ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : authenticated ? (
                <div className="py-4 space-y-4">
                  {isLoadingPoops ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Checking for gifts...</p>
                    </div>
                  ) : step === "pending" ? (
                    <p className="text-center text-muted-foreground">Redirecting to claim steps...</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-center text-muted-foreground">You&apos;re logged in.</p>
                      {!userEmail && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-center text-sm text-yellow-600 dark:text-yellow-400">
                            ⚠️ No email found. Please check your Privy account.
                          </p>
                          <p className="text-center text-xs text-muted-foreground mt-2">
                            Debug: User object = {JSON.stringify(user, null, 2)}
                          </p>
                        </div>
                      )}
                      {userEmail && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-center text-sm text-blue-600 dark:text-blue-400">
                            Email detected: {obscureEmail(userEmail)}
                          </p>
                          {pendingPoops.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground mt-2">
                              No pending gifts found. Please verify:
                              <br />
                              1. The email matches the gift recipient email
                              <br />
                              2. The gift is in &quot;FUNDED&quot; state
                              <br />
                              3. Check browser console for API errors
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Button onClick={handleLogin} size="lg" className="w-full">
                  Login with Email
                </Button>
              )}
            </div>
          )}

          {/* Pending POOP Step */}
          {step === "pending" && selectedPoop && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💩</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;ve been onboarded!</h1>
                {selectedPoop.sender_username && (
                  <p className="text-muted-foreground">By @{selectedPoop.sender_username}</p>
                )}
              </div>

              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center space-y-2">
                <div className="text-4xl">💩</div>
                <div className="text-3xl font-bold text-foreground">
                  {formattedAmount} USDC
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Complete these steps to claim:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {profileComplete ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={profileComplete ? "text-foreground" : "text-muted-foreground"}>
                        1. Complete your profile
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {humanityVerified ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={humanityVerified ? "text-foreground" : "text-muted-foreground"}>
                        2. Verify your humanity
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full border-2 border-muted-foreground" />
                      <span className="text-muted-foreground">3. Claim your gift</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {!profileComplete && (
                    <Button
                      onClick={() => setShowProfileDialog(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Step 1: Complete Profile
                    </Button>
                  )}

                  {profileComplete && !humanityVerified && (
                    <Button
                      onClick={handleVerifyHumanity}
                      variant="outline"
                      className="w-full"
                    >
                      Step 2: Verify Humanity
                    </Button>
                  )}

                  {canClaim && (
                    <Button
                      onClick={handleClaim}
                      size="lg"
                      className="w-full"
                    >
                      Step 3: Claim Gift
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verify Humanity Step (Mock with QR) */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2">Verify Your Humanity</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your Self app to verify you&apos;re human
                </p>
              </div>

              <div className="flex justify-center">
                <div className="p-8 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/30">
                  <QrCode className="size-32 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyHumanity}
                  size="lg"
                  className="w-full"
                >
                  I&apos;ve Verified (Mock)
                </Button>
                <Button
                  onClick={() => setStep("pending")}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Claiming Step */}
          {(step === "claiming" || step === "claimed") && (
            <div className="space-y-6 text-center">
              {step === "claiming" ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary mx-auto" />
                  <h2 className="text-xl font-bold text-foreground">Processing claim...</h2>
                  <p className="text-muted-foreground">Connecting wallet and transferring funds</p>
                </>
              ) : (
                <>
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
                      {formattedAmount} USDC transferred
                    </div>
                  </div>
                  <Link href="/">
                    <Button variant="outline" className="w-full bg-transparent">
                      Explore POOP
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          POOP — Real humans. Real onboarding. Real growth.
        </p>

        {/* Profile Setup Dialog */}
        <SetupUsernameDialogClaim
          open={showProfileDialog}
          onSuccess={handleProfileComplete}
          email={userEmail}
        />
      </div>
    </div>
  )
}

