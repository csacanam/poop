# POOP Contracts

Foundry project for POOP (Proof of Onboarding Protocol) smart contracts. The contracts manage USDC deposits, claims, and cancellations on Celo Mainnet.

## Overview

The main contract is `PoopVault`, which:
- Accepts USDC deposits from senders
- Holds funds securely until verification is complete
- Allows authorized owner (backend) to claim funds on behalf of verified recipients
- Supports cancellation and refund to sender

## Installation

1. Install Foundry (if not already installed):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:

```bash
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
```

## Compile

```bash
forge build
```

## Test

```bash
forge test
```

Run with verbosity:

```bash
forge test -vvv
```

## Deploy

### 1. Configure Environment Variables

Create a `.env` file in the `contracts/` directory:

```env
PRIVATE_KEY=your_deployer_private_key_without_0x_prefix
POOP_VAULT_OWNER=0x...  # Optional: backend wallet address (defaults to deployer)
CELO_RPC_URL=https://forno.celo.org  # Optional: has default
ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org  # Optional: has default
CELOSCAN_API_KEY=your_celoscan_api_key  # Required for --verify
```

### 2. Deploy to Celo Testnet (Alfajores)

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url alfajores --broadcast --verify
```

### 3. Deploy to Celo Mainnet

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url celo --broadcast --verify
```

### 4. Update ABI Files

After deployment, run the update script to sync ABIs to frontend and backend:

```bash
./scripts/update-abi.sh
```

This script automatically:
- Copies PoopVault ABI to `frontend/blockchain/abis/PoopVault.json`
- Copies PoopVault ABI to `backend/src/blockchain/abis/PoopVault.json`
- Creates contract info files with deployed address for both frontend and backend

## Contract Verification

If verification fails during deployment, you can verify manually:

```bash
# Load environment variables
source <(grep -E "^CELOSCAN_API_KEY" .env | sed 's/^/export /')

# Verify contract with constructor arguments
forge verify-contract <CONTRACT_ADDRESS> PoopVault \
  --chain-id 42220 \
  --etherscan-api-key "$CELOSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    0xcebA9300f2b948710d2653dD7B07f33A8B32118C \
    <OWNER_ADDRESS>)
```

Replace:
- `<CONTRACT_ADDRESS>` with the deployed contract address
- `<OWNER_ADDRESS>` with the owner address used during deployment

## Clean

```bash
forge clean
```

## Contract Details

### PoopVault

The main vault contract for managing POOP deposits and claims.

**Deployed Addresses:**

- **Celo Mainnet**: [`0x5333e149dede89095566dbde28c8179d62a68016`](https://celoscan.io/address/0x5333e149dede89095566dbde28c8179d62a68016)
- **Celo Sepolia**: Not deployed (use Alfajores for testing)

**Constructor Parameters:**

- `_token`: Address of the ERC20 token (USDC)
  - Celo Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
  - Alfajores Testnet: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- `_owner`: Address of the authorized owner (backend wallet) that can execute `claimFor`

**Key Functions:**

- `deposit(uint256 amount, string calldata poopId)`: Deposit USDC tokens for a recipient
  - Called by sender to fund a POOP
  - Transfers tokens from sender to vault
  - Emits `Deposit` event
  - Prevents duplicate `poopId`

- `claimFor(address to, uint256 amount, string calldata poopId)`: Claim tokens on behalf of a recipient
  - **Owner only** (backend wallet)
  - Transfers tokens from vault to recipient address
  - Emits `Claim` event
  - Prevents double-claiming

- `cancel(string calldata poopId)`: Cancel a POOP and refund to sender
  - Called by sender to cancel an unfunded POOP
  - Refunds deposited tokens to sender
  - Emits `Cancelled` event
  - Prevents cancellation of already claimed POOPs

**Events:**

- `Deposit(address indexed sender, uint256 amount, string poopId)`
- `Claim(address indexed sender, address indexed to, uint256 amount, string poopId)`
- `Cancelled(address indexed sender, uint256 amount, string poopId)`

**Security Features:**

- Owner-only `claimFor` function (prevents unauthorized claims)
- Duplicate `poopId` prevention
- Double-claiming prevention
- Cancellation protection (can't cancel claimed POOPs)
- Zero amount checks
- Transfer failure handling

## State Machine

POOPs transition through the following states (managed off-chain):

1. **CREATED**: POOP created in database, not yet funded
2. **FUNDED**: Deposit confirmed on-chain (via Alchemy webhook)
3. **VERIFIED**: Recipient verified identity with Self (off-chain)
4. **CLAIMED**: Funds claimed to recipient wallet
5. **CANCELLED**: POOP cancelled by sender

## Testing

The test suite (`test/PoopVault.t.sol`) covers:

- Deposit functionality
- Claim functionality (owner only)
- Cancellation functionality
- Duplicate prevention
- Double-claiming prevention
- Error cases (zero amount, unauthorized, etc.)
- Event emissions

Run tests:

```bash
forge test
```

## Project Structure

```
contracts/
├── contracts/
│   ├── PoopVault.sol        # Main vault contract
│   └── MockERC20.sol        # Mock token for testing
├── test/
│   └── PoopVault.t.sol      # Test suite
├── scripts/
│   ├── Deploy.s.sol         # Deployment script
│   └── update-abi.sh        # ABI sync script
├── docs/
│   ├── dev/                 # Developer documentation
│   └── llm/                 # LLM documentation
└── foundry.toml             # Foundry configuration
```

## Documentation

- **For Developers**: See [docs/dev/README.md](./docs/dev/README.md)
- **For LLM**: See [docs/llm/ARCHITECTURE.md](./docs/llm/ARCHITECTURE.md)

## Dependencies

- **OpenZeppelin Contracts**: For `IERC20` interface
- **Forge Std**: For testing utilities

## License

MIT
