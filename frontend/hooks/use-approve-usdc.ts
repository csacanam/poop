"use client"

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, useSwitchChain } from 'wagmi'
import { parseUnits, erc20Abi, maxUint256 } from 'viem'
import { getTokenAddress, getTokenDecimals, APP_CONFIG } from '@/blockchain/config'
import { getPoopVaultConfig } from '@/blockchain/contracts'

/**
 * Hook to approve USDC spending for PoopVault
 */
export function useApproveUSDC() {
  const { address, isConnected, chainId: connectedChainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  // Use the default chain from config
  const targetChainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
  const chainName = targetChainId === 11142220 ? 'CELO_SEPOLIA' : targetChainId === 42220 ? 'CELO' : 'CELO'
  
  const usdcAddress = getTokenAddress('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')
  const contractConfig = getPoopVaultConfig(targetChainId)
  
  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractConfig.address ? [address, contractConfig.address] : undefined,
    chainId: targetChainId,
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

  const approve = async (amount?: bigint) => {
    if (!isConnected || !address || !contractConfig.address) {
      throw new Error('Wallet not connected or contract address missing')
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

    // Use max approval by default, or specific amount if provided
    const approvalAmount = amount || maxUint256

    writeApprove({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [contractConfig.address, approvalAmount],
      chainId: targetChainId,
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

