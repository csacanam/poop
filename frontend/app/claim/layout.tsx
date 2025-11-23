"use client"

import { PrivyProvider } from "@privy-io/react-auth"
import type React from "react"

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""
  
  if (!privyAppId) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy login will not work.")
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["email"],
        embeddedWallets: {
          createOnLogin: "all-users", // Create wallet automatically for all users
        },
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}

