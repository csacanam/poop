"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi'
import { parseUnits } from 'viem'
import { getPoopVaultConfig } from '@/blockchain/contracts'
import { getTokenDecimals, APP_CONFIG } from '@/blockchain/config'

interface DepositPoopParams {
  amount: number // Amount in USDC (will be converted to wei with 6 decimals)
  poopId: string
}

/**
 * Hook to deposit funds into PoopVault for a POOP
 * Note: This requires USDC approval first. Use useApproveUSDC hook.
 */
export function useDepositPoop() {
  const { address, isConnected, chainId: connectedChainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  // Use the default chain from config
  const targetChainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
  const chainName = targetChainId === 11142220 ? 'CELO_SEPOLIA' : targetChainId === 42220 ? 'CELO' : 'CELO'
  
  // Get contract config for target chain
  const contractConfig = getPoopVaultConfig(targetChainId)
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

    // Check if we need to switch chains
    // connectedChainId might be undefined with Farcaster, so we check if it exists and is different
    if (connectedChainId && connectedChainId !== targetChainId) {
      try {
        await switchChain({ chainId: targetChainId })
        // Wait a bit for the chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        throw new Error(`Please switch to ${chainName} network in your wallet`)
      }
    }

    // Convert amount to wei (USDC uses 6 decimals)
    const amountInWei = parseUnits(amount.toString(), usdcDecimals)

    // writeContract is not async - it triggers the wallet UI
    // The transaction will be handled by the Farcaster wallet
    writeContract({
      address: contractConfig.address,
      abi: contractConfig.abi,
      functionName: 'deposit',
      args: [amountInWei, poopId],
      chainId: targetChainId,
    })
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

