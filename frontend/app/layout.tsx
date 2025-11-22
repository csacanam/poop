import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { WalletProvider } from "@/lib/wallet-context"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { FarcasterInit } from "@/components/farcaster-init"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "POOP - Proof of Onboarding Protocol",
  description: "Bring your loved ones into crypto — one POOP at a time",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Providers>
          <FarcasterInit />
        <WalletProvider>
          {children}
          <Toaster />
        </WalletProvider>
        </Providers>
      </body>
    </html>
  )
}
