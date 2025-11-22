"use client"

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { checkUser } from '@/lib/api-client'

interface UserData {
  id: string
  address: string
  username: string | null
  hasUsername: boolean
  email: string | null
  created_at: string
}

interface UseUserCheckReturn {
  user: UserData | null
  isLoading: boolean
  hasUsername: boolean
  refetch: () => Promise<void>
}

/**
 * Hook to check if the connected wallet has an associated user and username
 */
export function useUserCheck(): UseUserCheckReturn {
  const { address, isConnected } = useAccount()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchUser = async () => {
    if (!isConnected || !address) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await checkUser(address)
      console.log('[useUserCheck] API response:', result)
      if (result.exists && result.user) {
        // Trust the backend's hasUsername value, but also verify username exists
        const username = result.user.username
        const hasUsernameValue = result.user.hasUsername && !!username && username.trim().length > 0
        console.log('[useUserCheck] Username:', username, 'hasUsername from backend:', result.user.hasUsername, 'final hasUsername:', hasUsernameValue)
        setUser({
          ...result.user,
          hasUsername: hasUsernameValue,
        })
      } else {
        console.log('[useUserCheck] User does not exist')
        setUser(null)
      }
    } catch (error) {
      console.error('[useUserCheck] Error checking user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected])

  // Expose fetchUser directly for refetch
  const refetch = async () => {
    await fetchUser()
  }

  return {
    user,
    isLoading,
    hasUsername: user?.hasUsername ?? false,
    refetch,
  }
}

