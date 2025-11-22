"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { getPoopVaultConfig } from '@/blockchain/contracts'
import { APP_CONFIG } from '@/blockchain/config'

interface CancelPoopParams {
  poopId: string
}

/**
 * Hook to cancel a POOP and get refund
 * Note: Only the original sender can cancel their own POOP
 * 
 * IMPORTANT: We don't use useSwitchChain here because it internally calls getChainId
 * which causes "r.connector.getChainId is not a function" errors with Farcaster connector.
 * Instead, we rely on the wallet to handle chain switching automatically when needed.
 */
export function useCancelPoop() {
  // CRITICAL: DO NOT use chainId from useAccount() - Farcaster connector doesn't support it
  // CRITICAL: DO NOT use useSwitchChain() - it internally calls getChainId which fails
  // This causes "r.connector.getChainId is not a function" error
  const { address, isConnected } = useAccount()
  
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

  const cancel = ({ poopId }: CancelPoopParams) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Don't try to switch chains - let the wallet handle it automatically
    // Farcaster wallet will prompt the user to switch if needed
    // Specifying chainId in writeContract will trigger the wallet to switch if necessary
    
    // writeContract is not async - it triggers the wallet UI
    // The transaction will be handled by the Farcaster wallet
    // If the user is on the wrong chain, the wallet will prompt them to switch
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

