# POOP Contracts Architecture

## Overview

The POOP (Proof of Onboarding Protocol) contracts are built using Foundry, a modern development environment for smart contracts. The project uses Solidity 0.8.28 with OpenZeppelin Contracts for security and best practices.

## Project Structure

```
contracts/
├── contracts/          # Solidity contract source files
│   ├── PoopVault.sol  # Main vault contract for managing POOP deposits and claims
│   └── MockERC20.sol  # Mock ERC20 token for testing
├── test/              # Test files (Solidity tests using forge-std)
│   └── PoopVault.t.sol
├── scripts/           # Deployment scripts (Foundry scripts)
│   └── Deploy.s.sol
├── lib/               # Dependencies (OpenZeppelin, forge-std)
├── foundry.toml       # Foundry configuration
└── docs/              # Documentation
    ├── llm/           # Documentation for LLM
    └── dev/           # Documentation for developers
```

## Key Contracts

### PoopVault

The main contract that manages POOP deposits and claims.

**Constructor:**
- `_token`: ERC20 token address (USDC on Celo)
- `_owner`: Backend address that can execute `claimFor`

**Key Functions:**
- `deposit(recipient, amount, poopId)`: Sender deposits tokens for a recipient
- `claimFor(to, amount, poopId)`: Owner (backend) claims tokens on behalf of recipient
- `cancel(poopId)`: Original sender cancels POOP and gets refund

**Security Features:**
- Prevents duplicate `poopId` usage
- Tracks `poopId` to sender, recipient, and amount for precise cancellation
- Only original sender can cancel
- Only owner (backend) can claim
- Prevents claiming cancelled POOPs

## Deployment

Contracts are deployed using Foundry scripts located in `scripts/Deploy.s.sol`.

**USDC Addresses:**
- Celo Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
- Alfajores Testnet: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`

## Testing

All tests are written in Solidity using `forge-std/Test.sol`. Run tests with:
```bash
forge test
```

## Configuration

Foundry configuration is in `foundry.toml`. Key settings:
- Solidity version: 0.8.28
- Optimizer enabled with 200 runs
- RPC endpoints configured for Celo and Alfajores
- Etherscan verification keys configured

## Environment Variables

Required for deployment (in `.env`):
- `PRIVATE_KEY`: Deployer private key
- `POOP_VAULT_OWNER`: Backend address (optional, defaults to deployer)
- `CELO_RPC_URL`: Celo mainnet RPC (optional, has default)
- `ALFAJORES_RPC_URL`: Alfajores testnet RPC (optional, has default)
- `CELOSCAN_API_KEY`: API key for contract verification (optional)

