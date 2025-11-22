"use client"

import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { celo } from 'wagmi/chains'
import { getTokenAddress, getTokenDecimals, APP_CONFIG } from '@/blockchain/config'

export function useUSDCBalance() {
  const { address, isConnected } = useAccount()

  const usdcAddress = getTokenAddress('USDC', 'CELO')
  const usdcDecimals = getTokenDecimals('USDC', 'CELO')

  const { data: balance, isLoading, error } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: celo.id,
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

