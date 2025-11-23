"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, LogOut } from "lucide-react"
import { getRecipientPoops, checkUserByEmail, verifyUserAndAssociatePoop } from "@/lib/api-client"
import { obscureEmail } from "@/lib/utils"
import Link from "next/link"
import { SetupUsernameDialogClaim } from "@/components/setup-username-dialog-claim"
import { SelfVerificationStep } from "@/components/self-verification-step"
import { BalanceScreen } from "@/components/balance-screen"
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
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()
  const [step, setStep] = useState<"login" | "pending" | "profile" | "verify" | "balance" | "no-gifts">("login")
  const [pendingPoops, setPendingPoops] = useState<PendingPoop[]>([])
  const [selectedPoop, setSelectedPoop] = useState<PendingPoop | null>(null)
  const [isLoadingPoops, setIsLoadingPoops] = useState(false)
  const [obscuredEmail, setObscuredEmail] = useState<string>("")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [humanityVerified, setHumanityVerified] = useState(false)
  const [emailFromQuery, setEmailFromQuery] = useState<string>("")
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)
  const [userUuid, setUserUuid] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get user email from Privy - Privy stores email in user.email.address or user.linkedAccounts
  const userEmail = user?.email?.address || 
                    user?.linkedAccounts?.find((account: any) => account.type === 'email')?.address || 
                    ""

  // Get recipient wallet address - same as instant-payouts
  const walletAddress = user?.wallet?.address || null

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
      setObscuredEmail(obscureEmail(userEmail))
      checkUserProfile()
      fetchPendingPoops()
    }
  }, [ready, authenticated, userEmail])

  // When wallet is created, re-check profile to update UI
  useEffect(() => {
    if (walletAddress && ready && authenticated && userEmail) {
      // Wallet was just created, re-check profile to update UI
      checkUserProfile()
    }
  }, [walletAddress, ready, authenticated, userEmail])

  const checkUserProfile = async () => {
    if (!userEmail) return

    setIsCheckingProfile(true)
    try {
      const result = await checkUserByEmail(userEmail)
      console.log("[ClaimPage] User profile check result:", result)
      
      // Store user ID (UUID) - use the id field from users table as userId for Self
      if (result.exists && result.user && result.user.id) {
        setUserUuid(result.user.id)
      } else {
        setUserUuid(null)
      }
      
      if (result.exists && result.user && result.user.hasUsername) {
        // User exists and has username - profile is complete
        setProfileComplete(true)
        console.log("[ClaimPage] Profile already complete, skipping step 1")
        
        // If user is verified and POOP is in VERIFIED state, mark verification as complete too
        if (result.user.verified && selectedPoop?.state === 'VERIFIED') {
          setHumanityVerified(true)
        }
      } else {
        // User doesn't exist or doesn't have username - need to create profile
        setProfileComplete(false)
        console.log("[ClaimPage] Profile incomplete, will show dialog when needed")
      }
    } catch (error: any) {
      console.error("[ClaimPage] Error checking user profile:", error)
      // On error, assume profile is incomplete
      setProfileComplete(false)
      setUserUuid(null)
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
        const firstPoop = poops[0]
        setSelectedPoop(firstPoop) // Select the first (most recent) POOP
        
        // If POOP is in VERIFIED state, mark steps 1 and 2 as complete and go to balance screen
        if (firstPoop.state === 'VERIFIED') {
          setProfileComplete(true)
          setHumanityVerified(true)
          console.log("[ClaimPage] POOP is VERIFIED, showing balance screen")
          setStep("balance")
        } else {
          setStep("pending")
        }
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

  const handleProfileComplete = (userId: string) => {
    setProfileComplete(true)
    setShowProfileDialog(false)
    
    // Use the user ID (UUID) from the created user as userId for Self
    setUserUuid(userId)
    
    // Move to verify step if profile is complete
    if (humanityVerified) {
      setStep("claiming")
    } else {
      setStep("verify")
    }
  }

  const handleVerifyHumanity = useCallback(async () => {
    if (!userUuid || !selectedPoop || !userEmail) {
      console.error("[ClaimPage] Cannot verify: missing userUuid, selectedPoop, or userEmail")
      return
    }

    // Check if component is still mounted before updating state
    if (!isMountedRef.current) {
      console.log("[ClaimPage] Component unmounted, skipping verification update")
      return
    }

    try {
      // First, refresh the user profile to get the latest verification status
      // Self already called the backend directly, so the user should be verified now
      const userCheck = await checkUserByEmail(userEmail)
      
      // Check again if component is still mounted after async operation
      if (!isMountedRef.current) {
        return
      }
      
      if (userCheck.exists && userCheck.user && userCheck.user.verified) {
        // User is already verified by Self's backend call
        console.log("[ClaimPage] User already verified by Self, associating POOP")
        
        // Associate the POOP with the user and mark it as VERIFIED
        // This is safe to call even if already associated - it's idempotent
        await verifyUserAndAssociatePoop(userUuid, selectedPoop.id)
        
        // Check again if component is still mounted before updating state
        if (!isMountedRef.current) {
          return
        }
        
        // Mark verification as complete
        setHumanityVerified(true)
        
        // Update selectedPoop state to VERIFIED
        setSelectedPoop((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            state: 'VERIFIED',
          }
        })
        
        // Move to balance screen after verification
        setStep("balance")
      } else {
        // User not verified yet - this can happen if:
        // 1. Self verification is still processing
        // 2. User clicked "I've completed the steps above" to bypass Self verification
        console.warn("[ClaimPage] User not verified yet, attempting to associate POOP anyway (manual bypass)")
        
        // For manual bypass, try to associate the POOP directly
        // This allows users to continue if Self verification doesn't work
        try {
          await verifyUserAndAssociatePoop(userUuid, selectedPoop.id)
          
          if (!isMountedRef.current) {
            return
          }
          
          // Mark verification as complete (even though Self didn't verify)
          setHumanityVerified(true)
          
          // Update selectedPoop state to VERIFIED
          setSelectedPoop((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              state: 'VERIFIED',
            }
          })
          
          // Move to balance screen after verification
          setStep("balance")
        } catch (bypassError: any) {
          // If bypass fails (e.g., user already onboarded), show error
          console.error("[ClaimPage] Error in manual bypass:", bypassError)
          
          if (!isMountedRef.current) {
            return
          }
          
          // Check if error is about user already being onboarded
          if (bypassError.message && bypassError.message.includes('already been onboarded')) {
            // User already has a verified POOP - show error but don't block completely
            console.warn("[ClaimPage] User already onboarded, but allowing to continue with current POOP")
            // Still move to balance screen to show the POOP
            setHumanityVerified(true)
            setSelectedPoop((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                state: 'VERIFIED',
              }
            })
            setStep("balance")
          } else {
            // Other errors - wait a bit and retry checking Self verification
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current)
            }
            retryTimeoutRef.current = setTimeout(async () => {
              if (!isMountedRef.current) {
                return
              }
              
              try {
                const retryCheck = await checkUserByEmail(userEmail)
                
                if (!isMountedRef.current) {
                  return
                }
                
                if (retryCheck.exists && retryCheck.user && retryCheck.user.verified) {
                  await verifyUserAndAssociatePoop(userUuid, selectedPoop.id)
                  
                  if (!isMountedRef.current) {
                    return
                  }
                  
                  setHumanityVerified(true)
                  setSelectedPoop((prev) => {
                    if (!prev) return prev
                    return {
                      ...prev,
                      state: 'VERIFIED',
                    }
                  })
                  setStep("balance")
                } else {
                  console.error("[ClaimPage] User still not verified after retry")
                }
              } catch (retryError) {
                console.error("[ClaimPage] Error in retry:", retryError)
              }
            }, 2000)
          }
        }
      }
    } catch (error: any) {
      console.error("[ClaimPage] Error verifying user:", error)
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Optionally show error toast
      }
    }
  }, [userUuid, selectedPoop, userEmail])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const handleVerificationError = (error: any) => {
    console.error("[ClaimPage] Self verification error:", error)
    // Optionally show error toast
  }

  // Check if claim button should be enabled (no longer needed, using balance screen)
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
                      onClick={() => setStep("verify")}
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

          {/* Verify Humanity Step (Self Integration) */}
          {step === "verify" && (
            <SelfVerificationStep
              userId={userUuid}
              onSuccess={handleVerifyHumanity}
              onError={handleVerificationError}
              onBack={() => setStep("pending")}
            />
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

          {/* Balance Screen - shown after verification */}
          {step === "balance" && selectedPoop && (
            <BalanceScreen
              amount={selectedPoop.amount}
              senderUsername={selectedPoop.sender_username}
              poopId={selectedPoop.id}
              walletAddress={walletAddress}
            />
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

