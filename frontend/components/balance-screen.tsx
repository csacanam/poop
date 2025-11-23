"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowDownCircle, ShoppingCart, TrendingUp } from "lucide-react"
import { WithdrawDialog } from "./withdraw-dialog"

interface BalanceScreenProps {
  amount: number
  senderUsername: string | null
  poopId: string
  walletAddress: string | null
}

export function BalanceScreen({ amount, senderUsername, poopId, walletAddress }: BalanceScreenProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Your Balance</h2>
        {senderUsername && (
          <p className="text-muted-foreground">From @{senderUsername}</p>
        )}
      </div>

      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
        <p className="text-sm text-muted-foreground mb-2">Available balance</p>
        <div className="text-4xl font-bold text-foreground">
          ${formattedAmount} USDC
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">What would you like to do?</h3>
          <div className="grid grid-cols-3 gap-3">
            <WithdrawDialog
              poopId={poopId}
              amount={amount}
              walletAddress={walletAddress}
            />

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              disabled
            >
              <ShoppingCart className="size-5 opacity-50" />
              <span className="text-xs opacity-50">Spend</span>
              <span className="text-[10px] text-muted-foreground">Soon</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-24 gap-2"
              disabled
            >
              <TrendingUp className="size-5 opacity-50" />
              <span className="text-xs opacity-50">Rent</span>
              <span className="text-[10px] text-muted-foreground">Soon</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

