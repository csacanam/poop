"use client"

import { PrivyProvider } from "@privy-io/react-auth"
import type React from "react"

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    console.error("NEXT_PUBLIC_PRIVY_APP_ID is not set")
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
        embeddedWallets: {
          createOnLogin: "all-users", // Force wallet creation for all users (including existing ones)
        },
        loginMethods: ["email"],
      }}
    >
      {children}
    </PrivyProvider>
  )
}

