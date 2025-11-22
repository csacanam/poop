"use client"

import { Card } from "@/components/ui/card"
import { mockOnboardedUsers } from "@/lib/mock-data"
import { Users } from "lucide-react"

export function OnboardedUsers() {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Your Past POOPs</h2>
      </div>

      {mockOnboardedUsers.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-5xl mb-3 inline-block">💩</span>
          <p className="text-sm text-muted-foreground">No POOPs created yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start your first POOP to onboard someone!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mockOnboardedUsers.map((user) => (
            <div
              key={user.address}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground mb-1">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{shortenAddress(user.address)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">${user.firstGiftAmount}</p>
                <p className="text-xs text-muted-foreground">{formatDate(user.joinedDate)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {mockOnboardedUsers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">
            You&apos;ve created <span className="font-semibold text-foreground">{mockOnboardedUsers.length}</span> POOPs
            so far
          </p>
          <p className="text-xs text-center text-muted-foreground mt-1">
            Every POOP grows crypto. Keep POOPing responsibly.
          </p>
        </div>
      )}
    </Card>
  )
}
