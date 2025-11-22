"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseUnits, erc20Abi, maxUint256 } from 'viem'
import { getTokenAddress, getTokenDecimals, APP_CONFIG } from '@/blockchain/config'
import { getPoopVaultConfig } from '@/blockchain/contracts'

/**
 * Hook to approve USDC spending for PoopVault
 */
export function useApproveUSDC() {
  const { address, isConnected } = useAccount()
  
  // Use the default chain from config (don't use chainId from useAccount as Farcaster connector doesn't support it)
  const chainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
  const chainName = chainId === 11142220 ? 'CELO_SEPOLIA' : chainId === 42220 ? 'CELO' : 'CELO'
  
  const usdcAddress = getTokenAddress('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')
  const contractConfig = getPoopVaultConfig(chainId)
  
  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractConfig.address ? [address, contractConfig.address] : undefined,
    chainId: chainId,
    query: {
      enabled: isConnected && !!address && !!contractConfig.address,
    },
  })

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isPendingApprove,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract()

  const {
    isLoading: isConfirmingApprove,
    isSuccess: isApproved,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: {
      enabled: !!approveHash,
    },
  })

  const approve = (amount?: bigint) => {
    if (!isConnected || !address || !contractConfig.address) {
      throw new Error('Wallet not connected or contract address missing')
    }

    // Use max approval by default, or specific amount if provided
    const approvalAmount = amount || maxUint256

    writeApprove({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contractConfig.address, approvalAmount],
      chainId: chainId,
    })
  }

  // Refetch allowance after approval
  if (isApproved) {
    refetchAllowance()
  }

  return {
    approve,
    allowance: allowance || 0n,
    approveHash,
    isPending: isPendingApprove || isConfirmingApprove,
    isApproved,
    isSuccess: isApproved,
    error: approveError || approveReceiptError,
    reset: resetApprove,
    needsApproval: (amount: bigint) => {
      if (!allowance) return true
      return allowance < amount
    },
  }
}

