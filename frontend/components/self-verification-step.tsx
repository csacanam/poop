"use client"

import { useEffect, useState } from "react"
import { countries, SelfQRcodeWrapper } from "@selfxyz/qrcode"
import { SelfAppBuilder } from "@selfxyz/qrcode"
import { Button } from "@/components/ui/button"
import { PoopLoader } from "@/components/ui/poop-loader"

interface SelfVerificationStepProps {
  userId: string | null
  onSuccess: () => void
  onError: (error: any) => void
  onBack: () => void
}

export function SelfVerificationStep({
  userId,
  onSuccess,
  onError,
  onBack,
}: SelfVerificationStepProps) {
  const [selfApp, setSelfApp] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      console.warn("[SelfVerificationStep] No user UUID available")
      setIsLoading(false)
      return
    }

    const endpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT
    if (!endpoint || endpoint.trim() === "") {
      console.error("[SelfVerificationStep] NEXT_PUBLIC_SELF_ENDPOINT is not configured")
      onError(new Error("Self verification endpoint is not configured. Please set NEXT_PUBLIC_SELF_ENDPOINT environment variable."))
      setIsLoading(false)
      return
    }

    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "POOP",
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "poop-verification",
        endpoint: endpoint,
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png", // Default Self logo, can be customized
        userId: userId,
        endpointType: (process.env.NEXT_PUBLIC_SELF_ENDPOINT_TYPE as any) || "staging_celo",
        userIdType: "uuid", 
        userDefinedData: "POOP Identity Verification",
        disclosures: {
          // What you want to verify from the user's identity
          minimumAge: 18,
          excludedCountries: [
            countries.CUBA,
            countries.IRAN,
            countries.NORTH_KOREA,
            countries.RUSSIA,
          ],
          // What you want users to disclose
          nationality: true,
          gender: true,
        },
      }).build()

      setSelfApp(app)
      setIsLoading(false)
    } catch (error) {
      console.error("[SelfVerificationStep] Error creating Self app:", error)
      onError(error)
      setIsLoading(false)
    }
  }, [userId, onError])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Verify Your Humanity</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Setting up verification...
          </p>
        </div>
        <div className="flex justify-center">
          <PoopLoader size="md" />
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Profile Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please complete your profile first to get a user ID.
          </p>
        </div>
        <Button onClick={onBack} variant="outline" className="w-full">
          Back
        </Button>
      </div>
    )
  }

  if (!selfApp) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Failed to initialize verification. Please try again.
          </p>
        </div>
        <Button onClick={onBack} variant="outline" className="w-full">
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Verify Your Humanity</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Follow these steps to verify you&apos;re a real human
        </p>
      </div>

      {/* Step-by-step instructions */}
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Download the Self app</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get the Self app from your app store
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Add your passport</p>
            <p className="text-xs text-muted-foreground mt-1">
              Follow the app instructions to add your passport
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            3
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Scan this QR code</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use your Self app to scan the code below and verify you&apos;re a real human
            </p>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="p-4 bg-background rounded-lg border border-border">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={() => {
              // Clear any previous errors
              setVerificationError(null)
              // Call onSuccess - Self will automatically call the backend endpoint
              onSuccess()
            }}
            onError={(error: any) => {
              console.error('[SelfVerificationStep] Verification error:', error)
              setVerificationError(error?.message || 'Verification failed. Please try again.')
              // Also call onError for parent to handle
              onError(error)
            }}
          />
        </div>
      </div>

      {/* Error message */}
      {verificationError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{verificationError}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Fallback button - only show if there's an error */}
        {verificationError && (
          <Button 
            onClick={() => {
              setVerificationError(null)
              // Allow manual bypass if verification fails
              onSuccess()
            }} 
            variant="outline"
            size="lg" 
            className="w-full"
          >
            Continue Anyway (Skip Verification)
          </Button>
        )}
        <Button onClick={onBack} variant="outline" className="w-full">
          Back
        </Button>
      </div>
    </div>
  )
}

