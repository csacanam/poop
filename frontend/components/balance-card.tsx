"use client"

import { Card } from "@/components/ui/card"
import type { Token } from "@/lib/mock-data"

interface BalanceCardProps {
  token: Token
  onClick?: () => void
}

export function BalanceCard({ token, onClick }: BalanceCardProps) {
  const formattedBalance = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(token.balance)

  const formattedFiat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: token.fiatCurrency,
    minimumFractionDigits: 2,
  }).format(token.fiatValue)

  return (
    <Card onClick={onClick} className="p-4 hover:bg-accent transition-colors cursor-pointer border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center text-xl">{token.icon}</div>
          <div>
            <div className="font-semibold text-foreground">{token.symbol}</div>
            <div className="text-sm text-muted-foreground">{token.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-foreground">{formattedBalance}</div>
          <div className="text-sm text-muted-foreground">{formattedFiat}</div>
        </div>
      </div>
    </Card>
  )
}
