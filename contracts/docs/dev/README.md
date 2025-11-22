# Contracts - Developer Documentation

Smart contracts for POOP using Foundry.

## Installation

1. Install Foundry:

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

1. Configure `.env`:

```env
PRIVATE_KEY=your_private_key_without_0x_prefix
POOP_VAULT_OWNER=0xBackendAddress
CELO_RPC_URL=https://forno.celo.org
ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELOSCAN_API_KEY=your_api_key
```

2. Deploy to Alfajores testnet:

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url alfajores --broadcast --verify
```

3. Deploy to Celo mainnet:

```bash
forge script scripts/Deploy.s.sol:DeployPoopVault --rpc-url celo --broadcast --verify
```

**Important:** Make sure `CELOSCAN_API_KEY` is set in your `.env` file for automatic verification during deployment.

## Verify Contract

If verification fails during deployment, you can verify manually:

1. Load the API key from `.env`:

```bash
source <(grep -E "^CELOSCAN_API_KEY" .env | sed 's/^/export /')
```

2. Verify the contract with constructor arguments:

For Celo mainnet:

```bash
forge verify-contract <CONTRACT_ADDRESS> PoopVault \
  --chain-id 42220 \
  --etherscan-api-key "$CELOSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    0xcebA9300f2b948710d2653dD7B07f33A8B32118C \
    <OWNER_ADDRESS>)
```

For Alfajores testnet:

```bash
forge verify-contract <CONTRACT_ADDRESS> PoopVault \
  --chain-id 44787 \
  --etherscan-api-key "$CELOSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1 \
    <OWNER_ADDRESS>)
```

Replace:

- `<CONTRACT_ADDRESS>` with the deployed contract address
- `<OWNER_ADDRESS>` with the owner address used during deployment (e.g., `0x40C51B062EDcC4cfA65275179aa897222417F3d1`)

**Example** (Celo mainnet deployment):

```bash
source <(grep -E "^CELOSCAN_API_KEY" .env | sed 's/^/export /')

forge verify-contract 0x5333e149dede89095566dbde28c8179d62a68016 PoopVault \
  --chain-id 42220 \
  --etherscan-api-key "$CELOSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    0xcebA9300f2b948710d2653dD7B07f33A8B32118C \
    0x40C51B062EDcC4cfA65275179aa897222417F3d1)
```

## Clean

```bash
forge clean
```

## Contract Details

### PoopVault

Main contract for managing POOP deposits and claims.

**Deployed Addresses:**

- Celo Mainnet: [`0x5333e149dede89095566dbde28c8179d62a68016`](https://celoscan.io/address/0x5333e149dede89095566dbde28c8179d62a68016)

**Constructor:**

- `_token`: ERC20 token address (USDC)
  - Celo Mainnet: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
  - Alfajores Testnet: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- `_owner`: Backend address that can execute `claimFor`

**Key Functions:**

- `deposit(recipient, amount, poopId)`: Deposit tokens for a recipient
- `claimFor(to, amount, poopId)`: Claim tokens on behalf of a recipient (owner only)
- `cancel(poopId)`: Cancel a POOP and refund to sender
