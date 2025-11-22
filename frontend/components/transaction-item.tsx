"use client"

import type { Transaction } from "@/lib/mock-data"
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const statusIcons = {
    pending: <Clock className="size-4 text-yellow-600" />,
    claimed: <CheckCircle2 className="size-4 text-primary" />,
    failed: <XCircle className="size-4 text-destructive" />,
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
    claimed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  }

  const date = new Date(transaction.date)
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(transaction.amount)

  return (
    <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-full flex items-center justify-center ${
            transaction.type === "sent" ? "bg-red-100 dark:bg-red-950" : "bg-emerald-100 dark:bg-emerald-950"
          }`}
        >
          {transaction.type === "sent" ? (
            <ArrowUpRight className="size-5 text-red-600 dark:text-red-400" />
          ) : (
            <ArrowDownLeft className="size-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div>
          <div className="font-semibold text-foreground">
            {transaction.type === "sent" ? transaction.recipientName : transaction.senderName}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {formattedDate}
            <Badge
              variant="secondary"
              className={`${statusColors[transaction.status]} text-xs flex items-center gap-1`}
            >
              {statusIcons[transaction.status]}
              {transaction.status}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-semibold ${
            transaction.type === "sent" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {transaction.type === "sent" ? "-" : "+"}
          {formattedAmount} {transaction.token}
        </div>
        <div className="text-sm text-muted-foreground">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: transaction.fiatCurrency,
          }).format(transaction.fiatValue)}
        </div>
      </div>
    </div>
  )
}
