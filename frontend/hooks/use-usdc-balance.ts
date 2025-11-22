"use client"

import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { getTokenAddress, getTokenDecimals, APP_CONFIG } from '@/blockchain/config'

export function useUSDCBalance() {
  const { address, isConnected } = useAccount()

  // Use the default chain from config (can be easily changed in blockchain/config.ts)
  const chainId = APP_CONFIG.DEFAULT_CHAIN.id
  const chainName = chainId === 11142220 ? 'CELO_SEPOLIA' : chainId === 42220 ? 'CELO' : 'CELO'

  const usdcAddress = getTokenAddress('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')
  const usdcDecimals = getTokenDecimals('USDC', chainName as 'CELO' | 'CELO_SEPOLIA')

  const { data: balance, isLoading, error } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: chainId,
    query: {
      enabled: isConnected && !!address,
    },
  })

  const formattedBalance = balance ? Number(formatUnits(balance, usdcDecimals)) : 0

  return {
    balance: formattedBalance,
    isLoading,
    error,
    isConnected,
  }
}

