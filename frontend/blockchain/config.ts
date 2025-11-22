/**
 * Blockchain Configuration
 * 
 * Centralized configuration file for all blockchain-related constants,
 * contract addresses, and chain-specific settings.
 * 
 * This file should be the single source of truth for all blockchain
 * configuration values used across the application.
 */

// ============================================================================
// Chain Configuration
// ============================================================================

export const SUPPORTED_CHAINS = {
  CELO: {
    id: 42220,
    name: 'Celo Mainnet',
    rpcUrl: 'https://forno.celo.org',
  },
  BASE: {
    id: 8453,
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
  },
} as const

// ============================================================================
// Token Contract Addresses
// ============================================================================

/**
 * Token contract addresses by chain
 * All addresses are checksummed (EIP-55 format)
 */
export const TOKEN_ADDRESSES = {
  CELO: {
    // USDC on Celo Mainnet
    // Official contract: https://celoscan.io/token/0xcebA9300f2b948710d2653dD7B07f33A8B32118C
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as const,
  },
  BASE: {
    // Add Base token addresses here when needed
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const, // Example
  },
} as const

// ============================================================================
// Token Decimals
// ============================================================================

/**
 * Token decimal places by token and chain
 * USDC typically uses 6 decimals on most chains
 */
export const TOKEN_DECIMALS = {
  USDC: {
    CELO: 6,
    BASE: 6,
  },
} as const

// ============================================================================
// Application Constants
// ============================================================================

export const APP_CONFIG = {
  // Default chain for the application
  DEFAULT_CHAIN: SUPPORTED_CHAINS.CELO,
  
  // Default token
  DEFAULT_TOKEN: 'USDC' as const,
  
  // RPC endpoints (can be overridden by environment variables)
  RPC_ENDPOINTS: {
    CELO: process.env.NEXT_PUBLIC_CELO_RPC_URL || SUPPORTED_CHAINS.CELO.rpcUrl,
    BASE: process.env.NEXT_PUBLIC_BASE_RPC_URL || SUPPORTED_CHAINS.BASE.rpcUrl,
  },
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get token address for a specific chain
 */
export function getTokenAddress(token: keyof typeof TOKEN_ADDRESSES.CELO, chain: 'CELO' | 'BASE' = 'CELO'): string {
  return TOKEN_ADDRESSES[chain][token]
}

/**
 * Get token decimals for a specific chain
 */
export function getTokenDecimals(token: keyof typeof TOKEN_DECIMALS, chain: 'CELO' | 'BASE' = 'CELO'): number {
  return TOKEN_DECIMALS[token][chain]
}
