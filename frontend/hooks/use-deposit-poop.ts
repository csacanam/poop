"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { parseUnits } from 'viem'
import { getPoopVaultConfig } from '@/blockchain/contracts'
import { getTokenDecimals, APP_CONFIG } from '@/blockchain/config'

interface DepositPoopParams {
  amount: number // Amount in USDC (will be converted to wei with 6 decimals)
  poopId: string
}

/**
 * Hook to deposit funds into PoopVault for a POOP
 */
export function useDepositPoop() {
  const { address, isConnected } = useAccount()
  const connectedChainId = useChainId()
  
  // Use the default chain from config, or fallback to connected chain
  const chainId = APP_CONFIG.DEFAULT_CHAIN.id || connectedChainId
  const chainName = chainId === 11142220 ? 'CELO_SEPOLIA' : chainId === 42220 ? 'CELO' : 'CELO'
  
  // Get contract config for current chain
  const contractConfig = getPoopVaultConfig(chainId)
  const usdcDecimals = getTokenDecimals('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')
  
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

  const deposit = async ({ amount, poopId }: DepositPoopParams) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Convert amount to wei (USDC uses 6 decimals)
    const amountInWei = parseUnits(amount.toString(), usdcDecimals)

    try {
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'deposit',
        args: [amountInWei, poopId],
        chainId: chainId,
      })
    } catch (error) {
      console.error('Error calling deposit:', error)
      throw error
    }
  }

  return {
    deposit,
    hash,
    isPending: isPendingWrite || isConfirming,
    isConfirmed,
    isSuccess: isConfirmed,
    error: writeError || receiptError,
    reset: resetWrite,
  }
}

