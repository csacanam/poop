#!/bin/bash

# Script to update ABI files in frontend and backend after contract deployment
# Usage: ./scripts/update-abi.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$CONTRACTS_DIR")"

# Paths
ABI_SOURCE="$CONTRACTS_DIR/out/PoopVault.sol/PoopVault.json"
FRONTEND_ABI_DIR="$PROJECT_ROOT/frontend/blockchain/abis"
BACKEND_ABI_DIR="$PROJECT_ROOT/backend/src/blockchain/abis"

echo -e "${YELLOW}Updating ABI files...${NC}"

# Check if ABI source exists
if [ ! -f "$ABI_SOURCE" ]; then
    echo -e "${YELLOW}Warning: ABI source not found at $ABI_SOURCE${NC}"
    echo "Please run 'forge build' first to generate the ABI."
    exit 1
fi

# Create directories if they don't exist
mkdir -p "$FRONTEND_ABI_DIR"
mkdir -p "$BACKEND_ABI_DIR"

# Extract only the ABI from the JSON file
ABI_CONTENT=$(jq -r '.abi' "$ABI_SOURCE")

# Write ABI to frontend
echo "$ABI_CONTENT" > "$FRONTEND_ABI_DIR/PoopVault.json"
echo -e "${GREEN}✓${NC} Updated frontend ABI: $FRONTEND_ABI_DIR/PoopVault.json"

# Write ABI to backend
echo "$ABI_CONTENT" > "$BACKEND_ABI_DIR/PoopVault.json"
echo -e "${GREEN}✓${NC} Updated backend ABI: $BACKEND_ABI_DIR/PoopVault.json"

# Also copy the full JSON with address info if available
# Check for Celo mainnet (42220), Celo Sepolia (11142220), and Alfajores (44787 - deprecated)
CONTRACT_ADDRESS=""
CHAIN_ID=""

# Check Celo mainnet first (production - Farcaster supports this)
if [ -f "$CONTRACTS_DIR/broadcast/Deploy.s.sol/42220/run-latest.json" ]; then
    CONTRACT_ADDRESS=$(jq -r '.transactions[0].contractAddress' "$CONTRACTS_DIR/broadcast/Deploy.s.sol/42220/run-latest.json" 2>/dev/null || echo "")
    CHAIN_ID="42220"
# Check Celo Sepolia (testnet - Farcaster doesn't support this)
elif [ -f "$CONTRACTS_DIR/broadcast/Deploy.s.sol/11142220/run-latest.json" ]; then
    CONTRACT_ADDRESS=$(jq -r '.transactions[0].contractAddress' "$CONTRACTS_DIR/broadcast/Deploy.s.sol/11142220/run-latest.json" 2>/dev/null || echo "")
    CHAIN_ID="11142220"
# Check Alfajores testnet (deprecated)
elif [ -f "$CONTRACTS_DIR/broadcast/Deploy.s.sol/44787/run-latest.json" ]; then
    CONTRACT_ADDRESS=$(jq -r '.transactions[0].contractAddress' "$CONTRACTS_DIR/broadcast/Deploy.s.sol/44787/run-latest.json" 2>/dev/null || echo "")
    CHAIN_ID="44787"
fi

if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "null" ]; then
    # Create a contract info file with address
    CONTRACT_INFO=$(jq -n \
        --arg address "$CONTRACT_ADDRESS" \
        --arg chainId "$CHAIN_ID" \
        --argjson abi "$ABI_CONTENT" \
        '{address: $address, chainId: $chainId, abi: $abi}')
    
    echo "$CONTRACT_INFO" > "$FRONTEND_ABI_DIR/PoopVault.contract.json"
    echo "$CONTRACT_INFO" > "$BACKEND_ABI_DIR/PoopVault.contract.json"
    
    echo -e "${GREEN}✓${NC} Updated contract info with address: $CONTRACT_ADDRESS (Chain ID: $CHAIN_ID)"
    
    # Update contract configuration files
    # Frontend
    FRONTEND_CONTRACTS_FILE="$PROJECT_ROOT/frontend/blockchain/contracts.ts"
    cat > "$FRONTEND_CONTRACTS_FILE" << EOF
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
  // Alfajores Testnet (add when deployed)
  // 44787: '0x...' as const,
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
    throw new Error(\`PoopVault not deployed on chain \${chainId}\`)
  }
  return {
    address: address as \`0x\${string}\`,
    abi: POOP_VAULT_ABI,
  }
}
EOF
    
    # Backend
    BACKEND_CONTRACTS_FILE="$PROJECT_ROOT/backend/src/blockchain/contracts.ts"
    cat > "$BACKEND_CONTRACTS_FILE" << EOF
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
  // Alfajores Testnet (add when deployed)
  // 44787: '0x...' as const,
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
    throw new Error(\`PoopVault not deployed on chain \${chainId}\`)
  }
  return {
    address,
    abi: POOP_VAULT_ABI,
  }
}
EOF
    
    echo -e "${GREEN}✓${NC} Updated contract configuration files"
fi

echo -e "${GREEN}ABI update completed successfully!${NC}"

