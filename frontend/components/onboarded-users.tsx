"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, X } from "lucide-react"
import { useAccount } from "wagmi"
import { getUserPoops } from "@/lib/api-client"
import { obscureEmail } from "@/lib/utils"
import { useUserCheck } from "@/hooks/use-user-check"
import { useCancelPoop } from "@/hooks/use-cancel-poop"
import { useToast } from "@/hooks/use-toast"

interface Poop {
  id: string
  sender_user_id: string
  recipient_email: string
  amount: number
  chain_id: number
  state: 'FUNDED' | 'CLAIMED' | 'CANCELLED'
  created_at: string
  updated_at: string
}

export function OnboardedUsers() {
  const { address } = useAccount()
  const { username } = useUserCheck()
  const { toast } = useToast()
  const { cancel, hash: cancelHash, isPending: isCancelling, isSuccess: isCancelSuccess, error: cancelError } = useCancelPoop()
  const [poops, setPoops] = useState<Poop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingPoopId, setCancellingPoopId] = useState<string | null>(null)

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
  }, [address, username, isCancelSuccess])

  // Handle successful cancellation
  useEffect(() => {
    if (isCancelSuccess && cancellingPoopId) {
      toast({
        title: "POOP cancelled",
        description: "Your POOP has been cancelled and funds refunded",
      })
      setCancellingPoopId(null)
      // Refetch POOPs to update the list
      const fetchPoops = async () => {
        try {
          const data = await getUserPoops(address, username)
          setPoops(data || [])
        } catch (err) {
          console.error('Error refetching POOPs:', err)
        }
      }
      fetchPoops()
    }
  }, [isCancelSuccess, cancellingPoopId, address, username, toast])

  // Handle cancellation errors
  useEffect(() => {
    if (cancelError && cancellingPoopId) {
      toast({
        title: "Cancellation failed",
        description: cancelError.message || "Failed to cancel POOP",
        variant: "destructive",
      })
      setCancellingPoopId(null)
    }
  }, [cancelError, cancellingPoopId, toast])

  const handleCancel = async (poopId: string) => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setCancellingPoopId(poopId)
    try {
      await cancel({ poopId })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel POOP",
        variant: "destructive",
      })
      setCancellingPoopId(null)
    }
  }

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
    if (state === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-600 dark:text-gray-400">
          Cancelled
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
          <PoopLoader size="sm" className="mx-auto mb-3" />
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
              className="relative p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Top row: Email and Amount */}
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Email - full width */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground break-all leading-relaxed">
                    {obscureEmail(poop.recipient_email)}
                  </p>
                </div>
                
                {/* Amount top right - same font size as email */}
                <div className="text-right shrink-0">
                  <p className="font-medium text-foreground">
                    ${new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(poop.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">USDC</p>
                </div>
              </div>
              
              {/* Bottom row: Badge, date, and cancel button */}
              <div className="flex items-center justify-between gap-4">
                {/* Left: Badge and date */}
                <div className="flex items-center gap-3">
                  {getStateBadge(poop.state)}
                  <p className="text-xs text-muted-foreground">{formatDate(poop.created_at)}</p>
                </div>
                
                {/* Right: Cancel button */}
                {poop.state === 'FUNDED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(poop.id)}
                    disabled={isCancelling && cancellingPoopId === poop.id}
                    className="shrink-0"
                  >
                    {isCancelling && cancellingPoopId === poop.id ? (
                      <>
                        <span className="mr-1">💩</span>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="size-3 mr-1" />
                        Cancel
                      </>
                    )}
                  </Button>
                )}
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
