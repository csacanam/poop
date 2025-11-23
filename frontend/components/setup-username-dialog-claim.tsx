"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { checkUsername, createUser } from "@/lib/api-client"
import { PoopLoader } from "@/components/ui/poop-loader"
import { usePrivy, useWallets } from "@privy-io/react-auth"

interface SetupUsernameDialogClaimProps {
  open: boolean
  onSuccess: () => void
  email: string
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid"

export function SetupUsernameDialogClaim({ open, onSuccess, email }: SetupUsernameDialogClaimProps) {
  const { user, ready } = usePrivy()
  const { wallets } = useWallets()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [isCreating, setIsCreating] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [walletCheckTimeout, setWalletCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [walletStatus, setWalletStatus] = useState<"checking" | "found" | "not-found" | "timeout">("checking")

  // Get wallet address - same as instant-payouts
  const walletAddress = user?.wallet?.address || null

  // Detailed wallet verification logging
  useEffect(() => {
    if (ready && user && open) {
      console.log("[SetupUsernameDialogClaim] === WALLET VERIFICATION ===")
      console.log("[SetupUsernameDialogClaim] User object:", user)
      console.log("[SetupUsernameDialogClaim] User.wallet:", user?.wallet)
      console.log("[SetupUsernameDialogClaim] Wallets array:", wallets)
      console.log("[SetupUsernameDialogClaim] Wallets length:", wallets?.length || 0)
      console.log("[SetupUsernameDialogClaim] User.linkedAccounts:", user?.linkedAccounts)
      console.log("[SetupUsernameDialogClaim] Final walletAddress:", walletAddress)
      console.log("[SetupUsernameDialogClaim] ============================")

      if (walletAddress) {
        setWalletStatus("found")
        console.log("[SetupUsernameDialogClaim] ✅ Wallet found:", walletAddress)
      } else {
        setWalletStatus("checking")
        console.log("[SetupUsernameDialogClaim] ⏳ Wallet not found yet, waiting...")
      }
    }
  }, [ready, user, wallets, walletAddress, open])

  // Timeout for wallet creation - if wallet doesn't appear after 10 seconds, show error
  useEffect(() => {
    if (ready && user && !walletAddress && open && walletStatus === "checking") {
      const timeout = setTimeout(() => {
        console.warn("[SetupUsernameDialogClaim] ⚠️ Wallet creation timeout after 10 seconds")
        setWalletStatus("timeout")
        toast({
          title: "Wallet creation taking longer than expected",
          description: "Please refresh the page or try again. Your username can still be entered.",
          variant: "default",
        })
      }, 10000) // 10 seconds timeout

      setWalletCheckTimeout(timeout)

      return () => {
        if (timeout) clearTimeout(timeout)
      }
    } else if (walletAddress) {
      // Clear timeout if wallet is found
      if (walletCheckTimeout) {
        clearTimeout(walletCheckTimeout)
        setWalletCheckTimeout(null)
      }
      setWalletStatus("found")
    }
  }, [ready, user, walletAddress, open, walletStatus, walletCheckTimeout, toast])

  // Validate and check username availability when it changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Reset status if username is too short
    if (username.length > 0 && username.length < 3) {
      setUsernameStatus("idle")
      return
    }

    // Check username if it's 3+ characters
    if (username.length >= 3) {
      // Validate format first
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
      if (!usernameRegex.test(username)) {
        setUsernameStatus("invalid")
        return
      }

      // Debounce the API call
      const timer = setTimeout(async () => {
        setUsernameStatus("checking")
        try {
          const result = await checkUsername(username)
          setUsernameStatus(result.available ? "available" : "taken")
        } catch (error: any) {
          console.error("Error checking username:", error)
          setUsernameStatus("invalid")
        }
      }, 500) // 500ms debounce

      setDebounceTimer(timer)
    } else {
      setUsernameStatus("idle")
    }

    // Cleanup
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Wallet address not found. Please connect your wallet first.",
        variant: "destructive",
      })
      return
    }

    if (usernameStatus !== "available") {
      toast({
        title: "Invalid username",
        description: "Please choose an available username",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      await createUser(walletAddress, username, email || undefined)
      toast({
        title: "Success!",
        description: "Your profile has been created",
      })
      // Reset form
      setUsername("")
      setUsernameStatus("idle")
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Failed to create profile",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const canSubmit = usernameStatus === "available" && !isCreating && username.length >= 3 && !!walletAddress

  const getUsernameStatusIcon = () => {
    if (usernameStatus === "checking") {
      return <Loader2 className="size-4 animate-spin text-muted-foreground" />
    }
    if (usernameStatus === "available") {
      return <Check className="size-4 text-green-500" />
    }
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      return <X className="size-4 text-red-500" />
    }
    return null
  }

  const getUsernameStatusText = () => {
    if (username.length === 0) return ""
    if (username.length > 0 && username.length < 3) {
      return "Username must be at least 3 characters"
    }
    if (usernameStatus === "checking") {
      return "Checking availability..."
    }
    if (usernameStatus === "available") {
      return "Username is available!"
    }
    if (usernameStatus === "taken") {
      return "Username is already taken"
    }
    if (usernameStatus === "invalid") {
      return "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens"
    }
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription className="text-left">
            To claim your gift, please choose a unique username. This will be your identity in POOP.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={isCreating}
                maxLength={20}
                className={
                  usernameStatus === "available"
                    ? "border-green-500 focus-visible:border-green-500"
                    : usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "border-red-500 focus-visible:border-red-500"
                      : ""
                }
              />
              {username.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getUsernameStatusIcon()}
                </div>
              )}
            </div>
            {username.length >= 3 && (
              <p
                className={`text-xs ${
                  usernameStatus === "available"
                    ? "text-green-600 dark:text-green-400"
                    : usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                {getUsernameStatusText()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              This email is associated with your account
            </p>
          </div>

          {!walletAddress && ready && user && (
            <div className={`p-3 border rounded-lg ${
              walletStatus === "timeout" 
                ? "bg-yellow-500/10 border-yellow-500/20" 
                : "bg-blue-500/10 border-blue-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {walletStatus === "timeout" ? (
                  <>
                    <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Wallet creation is taking longer than expected
                    </p>
                  </>
                ) : (
                  <>
                    <PoopLoader size="sm" />
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Your wallet is being created automatically... This may take a moment.
                    </p>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {walletStatus === "timeout" 
                  ? "You can still enter your username. The wallet will be created when you submit."
                  : "You can still enter your username while we set up your wallet."}
              </p>
              {walletStatus === "checking" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Debug: User authenticated: {user ? "Yes" : "No"}, Wallets count: {wallets?.length || 0}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <PoopLoader size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

