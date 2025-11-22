"use client"

import { Card } from "@/components/ui/card"
import { Trophy, Users } from "lucide-react"
import { mockUserRankings } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
// </CHANGE>

export function UserRanking() {
  const currentUser = mockUserRankings.find((user) => user.isCurrentUser)
  const topUsers = mockUserRankings.filter((user) => !user.isCurrentUser).slice(0, 4)

  const displayUsers = currentUser ? [currentUser, ...topUsers] : topUsers

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Top POOPers</h3>
      </div>

      <div className="space-y-2">
        {displayUsers.map((user) => (
          <div
            key={user.address}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg transition-colors",
              user.isCurrentUser ? "bg-primary/10 border border-primary/20" : "bg-muted/30 hover:bg-muted/50",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center size-8 rounded-full font-semibold text-sm",
                  user.rank === 1
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    : user.rank === 2
                      ? "bg-gray-400/20 text-gray-600 dark:text-gray-400"
                      : user.rank === 3
                        ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {user.rank}
              </div>
              <div>
                <div className={cn("font-medium", user.isCurrentUser ? "text-primary" : "text-foreground")}>
                  {user.displayName}
                </div>
                <div className="text-xs text-muted-foreground">{shortenAddress(user.address)}</div>
                {/* </CHANGE> */}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Users className="size-4 text-muted-foreground" />
              {user.onboardedUsers}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
        These are the pioneers onboarding real humans into crypto
      </div>
    </Card>
  )
}
