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
      return
    }

    setIsLoading(true)
    try {
      const result = await checkUser(address)
      if (result.exists && result.user) {
        setUser(result.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [address, isConnected])

  return {
    user,
    isLoading,
    hasUsername: user?.hasUsername ?? false,
    refetch: fetchUser,
  }
}

