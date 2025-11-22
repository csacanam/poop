"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TransactionItem } from "@/components/transaction-item"
import { WalletConnect } from "@/components/wallet-connect"
import { useWallet } from "@/lib/wallet-context"
import { mockTransactions } from "@/lib/mock-data"
import { ArrowLeft, Gift } from "lucide-react"
import Link from "next/link"

export default function HistoryPage() {
  const { isConnected } = useWallet()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Gift className="size-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Transaction History</h1>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {!isConnected ? (
          <Card className="p-12 text-center border-border">
            <h2 className="text-xl font-semibold mb-2 text-foreground">Connect your wallet</h2>
            <p className="text-muted-foreground mb-6">View your transaction history</p>
            <WalletConnect />
          </Card>
        ) : (
          <div className="space-y-4">
            {mockTransactions.length === 0 ? (
              <Card className="p-12 text-center border-border">
                <p className="text-muted-foreground">No transactions yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {mockTransactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
