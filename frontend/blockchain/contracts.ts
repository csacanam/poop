/**
 * Contract Configuration by Chain
 * 
 * This file contains the deployed contract addresses and ABIs for each supported chain.
 * It is automatically updated by the update-abi.sh script after each deployment.
 */

import PoopVaultABI from './abis/PoopVault.json'
import PoopVaultContract from './abis/PoopVault.contract.json'

// Contract addresses by chain ID
export const POOP_VAULT_ADDRESSES = {
  // Celo Mainnet
  42220: '0x5333e149dede89095566dbde28c8179d62a68016' as const,
  // Celo Sepolia
  11142220: '0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8' as const,
} as const

// Contract ABI (same for all chains)
export const POOP_VAULT_ABI = PoopVaultABI

// Contract info with address (for current deployment)
export const POOP_VAULT_CONTRACT = PoopVaultContract as {
  address: string
  chainId?: string
  abi: typeof PoopVaultABI
}

/**
 * Get PoopVault contract address for a specific chain ID
 */
export function getPoopVaultAddress(chainId: number): string | undefined {
  return POOP_VAULT_ADDRESSES[chainId as keyof typeof POOP_VAULT_ADDRESSES]
}

/**
 * Get PoopVault contract configuration for a specific chain ID
 */
export function getPoopVaultConfig(chainId: number) {
  const address = getPoopVaultAddress(chainId)
  if (!address) {
    throw new Error(`PoopVault not deployed on chain ${chainId}`)
  }
  return {
    address: address as `0x${string}`,
    abi: POOP_VAULT_ABI,
  }
}
