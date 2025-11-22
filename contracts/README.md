# Contracts

Foundry project for POOP smart contracts.

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

## Deploy

1. Configure your `.env` file:

   - `PRIVATE_KEY`: Private key of the deployer account (without 0x prefix)
   - `POOP_VAULT_OWNER`: Address of the backend/owner that can execute `claimFor` (optional, defaults to deployer)
   - `CELO_RPC_URL`: RPC URL for Celo mainnet (optional, has default: `https://forno.celo.org`)
   - `ALFAJORES_RPC_URL`: RPC URL for Celo Alfajores testnet (optional, has default)
   - `CELOSCAN_API_KEY`: API key for contract verification (required for `--verify`)

2. Deploy to Celo testnet (Alfajores):

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url alfajores --broadcast --verify
```

3. Deploy to Celo mainnet:

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url celo --broadcast --verify
```

4. Update ABI files in frontend and backend:

```bash
./scripts/update-abi.sh
```

This script automatically copies the PoopVault ABI to:

- `frontend/blockchain/abis/PoopVault.json` (ABI only)
- `backend/src/blockchain/abis/PoopVault.json` (ABI only)
- `frontend/blockchain/abis/PoopVault.contract.json` (ABI + deployed address)
- `backend/src/blockchain/abis/PoopVault.contract.json` (ABI + deployed address)

**Note:** If verification fails during deployment, you can verify manually afterward:

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

## Documentation

- **For Developers**: See [docs/dev/README.md](./docs/dev/README.md)
- **For LLM**: See [docs/llm/ARCHITECTURE.md](./docs/llm/ARCHITECTURE.md)

## Contract Details

### PoopVault

The main contract for managing POOP deposits and claims.

**Deployed Addresses:**

- Celo Mainnet: [`0x5333e149dede89095566dbde28c8179d62a68016`](https://celoscan.io/address/0x5333e149dede89095566dbde28c8179d62a68016)

**Constructor Parameters:**

- `_token`: Address of the ERC20 token (USDC)
  - Celo Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
  - Alfajores Testnet: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- `_owner`: Address of the authorized owner (backend) that can execute `claimFor`

**Key Functions:**

- `deposit(recipient, amount, poopId)`: Deposit tokens for a recipient
- `claimFor(to, amount, poopId)`: Claim tokens on behalf of a recipient (owner only)
- `cancel(poopId)`: Cancel a POOP and refund to sender
