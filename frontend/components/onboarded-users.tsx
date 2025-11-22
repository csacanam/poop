"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Users, Loader2 } from "lucide-react"
import { useAccount } from "wagmi"
import { getUserPoops } from "@/lib/api-client"
import { obscureEmail } from "@/lib/utils"
import { useUserCheck } from "@/hooks/use-user-check"

interface Poop {
  id: string
  sender_user_id: string
  recipient_email: string
  amount: number
  chain_id: number
  state: 'FUNDED' | 'CLAIMED'
  created_at: string
  updated_at: string
}

export function OnboardedUsers() {
  const { address } = useAccount()
  const { username } = useUserCheck()
  const [poops, setPoops] = useState<Poop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPoops = async () => {
      if (!address && !username) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getUserPoops(address, username)
        setPoops(data || [])
      } catch (err: any) {
        console.error('Error fetching POOPs:', err)
        setError(err.message || 'Failed to load POOPs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoops()
  }, [address, username])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  const getStateBadge = (state: string) => {
    if (state === 'CLAIMED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
          Claimed
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
        Funded
      </span>
    )
  }

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Your Past POOPs</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="size-6 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your POOPs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <span className="text-5xl mb-3 inline-block">⚠️</span>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : poops.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-5xl mb-3 inline-block">💩</span>
          <p className="text-sm text-muted-foreground">No POOPs created yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start your first POOP to onboard someone!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {poops.map((poop) => (
            <div
              key={poop.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground truncate">
                    {obscureEmail(poop.recipient_email)}
                  </p>
                  {getStateBadge(poop.state)}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(poop.created_at)}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-medium text-foreground">
                  ${new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(poop.amount)}
                </p>
                <p className="text-xs text-muted-foreground">USDC</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {poops.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">
            You&apos;ve created <span className="font-semibold text-foreground">{poops.length}</span> POOPs
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
