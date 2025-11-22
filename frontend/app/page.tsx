"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WalletConnect } from "@/components/wallet-connect"
import { SendGiftDialog } from "@/components/send-gift-dialog"
import { SetupUsernameDialog } from "@/components/setup-username-dialog"
import { UserRanking } from "@/components/user-ranking"
import { OnboardedUsers } from "@/components/onboarded-users"
import { useWallet } from "@/lib/wallet-context"
import { useUSDCBalance } from "@/hooks/use-usdc-balance"
import { useUserCheck } from "@/hooks/use-user-check"
import { History } from "lucide-react"

export default function HomePage() {
  const { isConnected } = useWallet()
  const { hasUsername, isLoading: isLoadingUser, refetch: refetchUser } = useUserCheck()
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [showPastPoops, setShowPastPoops] = useState(false)
  const [showUsernameDialog, setShowUsernameDialog] = useState(false)
  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance()

  // Show username dialog when wallet is connected but user doesn't have username
  useEffect(() => {
    console.log('[HomePage] Username check:', { isConnected, isLoadingUser, hasUsername })
    if (isConnected && !isLoadingUser && !hasUsername) {
      console.log('[HomePage] Opening username dialog')
      setShowUsernameDialog(true)
    } else if (hasUsername) {
      console.log('[HomePage] User has username, closing dialog')
      setShowUsernameDialog(false)
    }
  }, [isConnected, isLoadingUser, hasUsername])

  const handleUsernameDialogSuccess = async () => {
    setShowUsernameDialog(false)
    await refetchUser()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💩</span>
            <h1 className="text-xl font-bold text-foreground">POOP</h1>
          </div>
          {/* </CHANGE> */}
          <div className="flex items-center gap-3">
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {!isConnected ? (
          <Card className="p-12 text-center border-border">
            <span className="text-6xl mb-4 inline-block">💩</span>
            <h2 className="text-2xl font-semibold mb-2 text-foreground">
              Welcome to POOP
              <span className="block text-sm text-muted-foreground font-normal mt-1">
                (Proof of Onboarding Protocol)
              </span>
            </h2>
            {/* </CHANGE> */}
            <p className="text-muted-foreground mb-6">Bring your loved ones into crypto — one POOP at a time.</p>
            <WalletConnect />
          </Card>
        ) : (
          <div className="space-y-6">
            {!showPastPoops ? (
              <>
                <Card className="p-6 border-border bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">USDC Balance</div>
                      <div className="text-3xl font-bold text-foreground">
                        {isLoadingBalance ? (
                          "Loading..."
                        ) : (
                          <>
                            $
                            {new Intl.NumberFormat("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(usdcBalance)}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-4xl">💵</div>
                  </div>
                  <Button onClick={() => setSendDialogOpen(true)} className="w-full gap-2" size="lg">
                    <span className="text-lg">💩</span>
                    Create a POOP
                  </Button>
                </Card>

                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowPastPoops(true)}
                >
                  <History className="size-4" />
                  View Your Past POOPs
                </Button>

                <UserRanking />
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowPastPoops(false)}
                >
                  Back to Dashboard
                </Button>
                <OnboardedUsers />
              </>
            )}
          </div>
        )}
      </main>

      <SendGiftDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen} preselectedToken="USDC" />
      <SetupUsernameDialog open={showUsernameDialog} onSuccess={handleUsernameDialogSuccess} />
    </div>
  )
}
