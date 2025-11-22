"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi'
import { getPoopVaultConfig } from '@/blockchain/contracts'
import { APP_CONFIG } from '@/blockchain/config'

interface CancelPoopParams {
  poopId: string
}

/**
 * Hook to cancel a POOP and get refund
 * Note: Only the original sender can cancel their own POOP
 */
export function useCancelPoop() {
  // DO NOT use chainId from useAccount() - Farcaster connector doesn't support it
  const { address, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  
  // Use the default chain from config
  const targetChainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
  
  // Get contract config for target chain
  const contractConfig = getPoopVaultConfig(targetChainId)
  
  const {
    writeContract,
    data: hash,
    isPending: isPendingWrite,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  })

  const cancel = async ({ poopId }: CancelPoopParams) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Always attempt to switch to target chain before transaction
    // This ensures we're on the correct chain regardless of current state
    try {
      await switchChain({ chainId: targetChainId })
      // Wait a bit for the chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      // If switch fails, it might mean we're already on the correct chain
      // Continue with the transaction anyway
      console.warn('Chain switch failed or already on correct chain:', error)
    }

    // writeContract is not async - it triggers the wallet UI
    // The transaction will be handled by the Farcaster wallet
    writeContract({
      address: contractConfig.address,
      abi: contractConfig.abi,
      functionName: 'cancel',
      args: [poopId],
      chainId: targetChainId,
    })
  }

  return {
    cancel,
    hash,
    isPending: isPendingWrite || isConfirming,
    isConfirmed,
    isSuccess: isConfirmed,
    error: writeError || receiptError,
    reset: resetWrite,
  }
}

