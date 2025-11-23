"use client"

import { useState, useEffect } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, QrCode, LogOut } from "lucide-react"
import { getRecipientPoops, checkUserByEmail } from "@/lib/api-client"
import { obscureEmail } from "@/lib/utils"
import Link from "next/link"
import { SetupUsernameDialogClaim } from "@/components/setup-username-dialog-claim"
import { PoopLoader } from "@/components/ui/poop-loader"

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
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const [step, setStep] = useState<"login" | "pending" | "profile" | "verify" | "claiming" | "claimed" | "no-gifts">("login")
  const [pendingPoops, setPendingPoops] = useState<PendingPoop[]>([])
  const [selectedPoop, setSelectedPoop] = useState<PendingPoop | null>(null)
  const [isLoadingPoops, setIsLoadingPoops] = useState(false)
  const [obscuredEmail, setObscuredEmail] = useState<string>("")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [humanityVerified, setHumanityVerified] = useState(false)
  const [emailFromQuery, setEmailFromQuery] = useState<string>("")
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)
  const [prevWalletAddress, setPrevWalletAddress] = useState<string | null>(null)

  // Get user email from Privy - Privy stores email in user.email.address or user.linkedAccounts
  const userEmail = user?.email?.address || 
                    user?.linkedAccounts?.find((account: any) => account.type === 'email')?.address || 
                    ""

  // Get recipient wallet address - same as instant-payouts
  const walletAddress = user?.wallet?.address || null

  // Debug logging - including wallet status
  useEffect(() => {
    console.log("[ClaimPage] Privy state:", {
      ready,
      authenticated,
      user,
      userEmail,
      step,
    })
  }, [ready, authenticated, user, userEmail, step])

  // Wallet verification logging - check wallet status even when dialog is closed
  useEffect(() => {
    if (ready && authenticated && user) {
      console.log("[ClaimPage] === WALLET STATUS CHECK ===")
      console.log("[ClaimPage] User object:", user)
      console.log("[ClaimPage] User.wallet:", user?.wallet)
      console.log("[ClaimPage] Wallets array:", wallets)
      console.log("[ClaimPage] Wallets length:", wallets?.length || 0)
      console.log("[ClaimPage] User.linkedAccounts:", user?.linkedAccounts)
      console.log("[ClaimPage] Final walletAddress:", walletAddress)
      if (walletAddress) {
        console.log("[ClaimPage] ✅ Wallet FOUND:", walletAddress)
      } else {
        console.log("[ClaimPage] ⏳ Wallet NOT FOUND yet")
      }
      console.log("[ClaimPage] ==========================")
    }
  }, [ready, authenticated, user, wallets, walletAddress])

  // Monitor wallet creation - when wallet is created, ensure UI updates to show next steps
  useEffect(() => {
    if (ready && authenticated && user) {
      const currentWallet = user?.wallet?.address || null
      
      // If wallet was just created (changed from null to an address), force UI update
      if (currentWallet && currentWallet !== prevWalletAddress) {
        console.log("[ClaimPage] ✅ Wallet created, updating UI:", currentWallet)
        setPrevWalletAddress(currentWallet)
        // Force a re-render by updating a state that triggers UI refresh
        // The walletAddress dependency in other useEffects will handle the rest
      } else if (!currentWallet) {
        setPrevWalletAddress(null)
      }
    }
  }, [ready, authenticated, user, walletAddress, prevWalletAddress])

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

  // When user logs in, check profile and fetch pending POOPs
  useEffect(() => {
    if (ready && authenticated && userEmail) {
      console.log("[ClaimPage] User logged in, checking profile and fetching POOPs for email:", userEmail)
      setObscuredEmail(obscureEmail(userEmail))
      checkUserProfile()
      fetchPendingPoops()
    } else if (ready && authenticated && !userEmail) {
      console.warn("[ClaimPage] User authenticated but no email found")
    }
  }, [ready, authenticated, userEmail])

  const checkUserProfile = async () => {
    if (!userEmail) return

    setIsCheckingProfile(true)
    try {
      const result = await checkUserByEmail(userEmail)
      console.log("[ClaimPage] User profile check result:", result)
      
      if (result.exists && result.user && result.user.hasUsername) {
        // User exists and has username - profile is complete
        setProfileComplete(true)
        console.log("[ClaimPage] Profile already complete, skipping step 1")
      } else {
        // User doesn't exist or doesn't have username - need to create profile
        setProfileComplete(false)
        console.log("[ClaimPage] Profile incomplete, will show dialog when needed")
      }
    } catch (error: any) {
      console.error("[ClaimPage] Error checking user profile:", error)
      // On error, assume profile is incomplete
      setProfileComplete(false)
    } finally {
      setIsCheckingProfile(false)
    }
  }

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
        console.log("[ClaimPage] No POOPs found, showing no-gifts message")
        setStep("no-gifts") // No POOPs found - show message
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

  const handleLogout = async () => {
    try {
      await logout()
      setStep("login")
      setProfileComplete(false)
      setHumanityVerified(false)
      setPendingPoops([])
      setSelectedPoop(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
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
          {authenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4 mr-2" />
              Sign Out
            </Button>
          )}
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
                  <PoopLoader size="md" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : authenticated ? (
                isLoadingPoops ? (
                  <div className="py-8 flex flex-col items-center gap-4">
                    <PoopLoader size="md" />
                    <p className="text-muted-foreground">Checking for gifts...</p>
                  </div>
                ) : step === "pending" || step === "profile" || step === "verify" || step === "claiming" || step === "claimed" ? null : (
                  <div className="py-4">
                    {/* This will be handled by the "no-gifts" step below */}
                  </div>
                )
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
                <h1 className="text-2xl font-bold text-foreground mb-2">You have received a gift</h1>
                {selectedPoop.sender_username && (
                  <p className="text-muted-foreground">By @{selectedPoop.sender_username}</p>
                )}
              </div>

              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">
                  ${formattedAmount} USDC
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
                  {isCheckingProfile ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                      <PoopLoader size="sm" />
                      <span className="text-sm">Checking profile...</span>
                    </div>
                  ) : !profileComplete ? (
                    <Button
                      onClick={() => setShowProfileDialog(true)}
                      variant="outline"
                      className="w-full"
                    >
                      Step 1: Complete Profile
                    </Button>
                  ) : null}

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

          {/* No Gifts Found Step */}
          {step === "no-gifts" && (
            <div className="space-y-6 text-center">
              <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">📭</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  <span className="text-3xl mr-2">💩</span>No POOP here
                </h2>
                <p className="text-muted-foreground mb-4">
                  We couldn&apos;t find any pending POOPs for {userEmail ? obscureEmail(userEmail) : "your email"}.
                </p>
                <div className="p-4 bg-muted rounded-lg text-left space-y-2 text-sm">
                  <p className="font-semibold text-foreground">This could mean:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>The gift hasn&apos;t been funded yet</li>
                    <li>The gift was already claimed</li>
                    <li>The email doesn&apos;t match the gift recipient</li>
                  </ul>
                </div>
              </div>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Go to Home
                </Button>
              </Link>
            </div>
          )}

          {/* Claiming Step */}
          {(step === "claiming" || step === "claimed") && (
            <div className="space-y-6 text-center">
              {step === "claiming" ? (
                <>
                  <PoopLoader size="md" />
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

