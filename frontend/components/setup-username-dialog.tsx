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
import { Loader2, Check, X, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { checkUsername, createUser } from "@/lib/api-client"
import { useAccount } from "wagmi"
import { PoopLoader } from "@/components/ui/poop-loader"

interface SetupUsernameDialogProps {
  open: boolean
  onSuccess: () => void
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid"

export function SetupUsernameDialog({ open, onSuccess }: SetupUsernameDialogProps) {
  const { address } = useAccount()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [isCreating, setIsCreating] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

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

    if (!address) {
      toast({
        title: "Error",
        description: "Wallet address not found",
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
      await createUser(address, username, email || undefined)
      toast({
        title: "Success!",
        description: "Your profile has been created",
      })
      onSuccess()
      // Reset form
      setUsername("")
      setEmail("")
      setUsernameStatus("idle")
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

  const canSubmit = usernameStatus === "available" && !isCreating && username.length >= 3

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
            To get started, please choose a unique username. This will be your identity in POOP.
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
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              We'll use this to notify you about important updates
            </p>
          </div>

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

