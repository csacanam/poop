"use client"

import { useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

export function FarcasterInit() {
  useEffect(() => {
    // Initialize and mark app as ready after it's fully loaded
    const initFarcaster = async () => {
      try {
        // Wait a bit to ensure the app is fully rendered
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // Mark the app as ready to hide splash screen
        await sdk.actions.ready()
      } catch (error) {
        // Handle error silently if not running in Farcaster environment
        console.warn("Farcaster SDK not available:", error)
      }
    }

    initFarcaster()
  }, [])

  return null
}

