# POOP Frontend

Frontend application for POOP (Proof of Onboarding Protocol) built with Next.js 14, React, and TypeScript.

## Overview

The frontend consists of two main flows:

1. **Sender Flow** (Farcaster Mini App) - `/`
   - Connect Farcaster wallet
   - Create and fund POOPs
   - View past POOPs
   - Cancel POOPs

2. **Recipient Flow** (Web Claim) - `/claim`
   - Email login with Privy
   - Profile setup
   - Self identity verification
   - Claim USDC to wallet

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com

# Privy App ID for email login (claim flow)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Self Verification Configuration
NEXT_PUBLIC_SELF_APP_NAME=POOP
NEXT_PUBLIC_SELF_SCOPE=poop-verification
NEXT_PUBLIC_SELF_ENDPOINT=https://your-backend-url.com/api/self/verify
NEXT_PUBLIC_SELF_ENDPOINT_TYPE=https
```

See `env.example` for a complete example.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Features

### Sender Flow (Farcaster Mini App)

- **Automatic Wallet Connection**: Uses Farcaster Mini App connector for seamless wallet connection
- **USDC Balance Display**: Shows USDC balance from Celo Mainnet
- **Create POOP**: Send USDC gifts via email
- **Fund POOP**: Deposit USDC to PoopVault contract
- **View Past POOPs**: See all POOPs you've created
- **Cancel POOP**: Cancel unfunded POOPs and get refund

### Recipient Flow (Web Claim)

- **Email Login**: Privy email-only authentication
- **Automatic Wallet Creation**: Privy creates embedded wallet automatically
- **Profile Setup**: Create username and profile
- **Self Verification**: Verify humanity using Self's zero-knowledge proofs
- **Claim Funds**: Withdraw USDC to any Celo wallet address

## Key Integrations

### Farcaster Mini App

- Uses `@farcaster/miniapp-wagmi-connector` for wallet connection
- Automatically connects wallet when opened in Farcaster
- Custom workaround for `getChainId()` method (see `lib/wagmi-config.ts`)

**Code**: [`lib/wagmi-config.ts:4`](./lib/wagmi-config.ts#L4)

### Privy

- Email authentication for claim flow
- Embedded wallet creation
- Access token management

**Code**: [`app/claim/layout.tsx:26`](./app/claim/layout.tsx#L26)

### Self Identity Verification

- QR code generation using `@selfxyz/qrcode`
- Backend verification endpoint integration
- Manual skip option for testing

**Code**: [`components/self-verification-step.tsx:4-5`](./components/self-verification-step.tsx#L4-L5)

### Celo & USDC

- Celo Mainnet (chain ID: 42220)
- USDC token interactions
- Contract interactions via Wagmi/Viem

**Code**: [`blockchain/config.ts`](./blockchain/config.ts)

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                 # Sender flow (Farcaster Mini App)
│   ├── claim/
│   │   ├── layout.tsx          # Privy provider for claim flow
│   │   └── page.tsx            # Recipient flow (claim)
│   └── history/
│       └── page.tsx            # Transaction history
├── components/
│   ├── send-gift-dialog.tsx   # Create and fund POOP
│   ├── onboarded-users.tsx    # Past POOPs list
│   ├── self-verification-step.tsx  # Self verification UI
│   ├── balance-screen.tsx     # Balance display after verification
│   ├── withdraw-dialog.tsx     # Withdraw instructions
│   ├── setup-username-dialog.tsx  # Profile setup (Farcaster)
│   ├── setup-username-dialog-claim.tsx  # Profile setup (claim)
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── use-deposit-poop.ts    # Deposit to contract
│   ├── use-cancel-poop.ts      # Cancel POOP
│   ├── use-usdc-balance.ts    # USDC balance
│   └── use-user-check.ts      # User profile check
├── lib/
│   ├── wagmi-config.ts        # Wagmi configuration with Farcaster connector
│   ├── api-client.ts          # Backend API client
│   └── wallet-context.tsx    # Wallet context
└── blockchain/
    ├── config.ts              # Blockchain configuration (centralized)
    ├── contracts.ts           # Contract addresses and ABIs
    └── abis/                  # Contract ABIs
```

## Blockchain Configuration

All blockchain constants are centralized in `blockchain/config.ts`:

- Contract addresses
- Chain IDs
- Token addresses and decimals
- RPC endpoints

**Always use this file** instead of hardcoding values. See `docs/llm/ARCHITECTURE.md` for details.

## Farcaster Mini App Setup

The app is designed to work as a Farcaster Mini App:

1. **Wallet Connection**: Automatically connects when opened in Farcaster
2. **Chain Support**: Configured for Celo Mainnet (Farcaster supports this)
3. **Contract Interactions**: All onchain actions happen on Celo

**Important**: The Farcaster connector has a known limitation where `getChainId()` is not implemented. We've added a workaround in `lib/wagmi-config.ts`.

## Claim Flow Details

The `/claim` route implements a multi-step flow:

1. **Login**: Privy email authentication
2. **Profile**: Check/create user profile
3. **Verification**: Self identity verification
4. **Balance**: Display available balance and withdrawal options

If a POOP is already in `VERIFIED` state, steps 1 and 2 are skipped.

## Deployment

### Vercel

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

Ensure:
- Node.js 18+ is available
- Environment variables are set
- Build command: `npm run build`
- Start command: `npm start`

## Development Notes

### Farcaster Connector Workaround

The Farcaster Mini App connector doesn't implement `getChainId()`. We've added multiple layers of patching in `lib/wagmi-config.ts` to handle this. **Never use `useSwitchChain` or access `chainId` from `useAccount()`** - always use `APP_CONFIG.DEFAULT_CHAIN.id` instead.

### Privy Embedded Wallets

Privy automatically creates embedded wallets for users in the claim flow. The wallet address is used for verification but the actual claim transaction is executed by the backend.

### Self Verification

Self verification uses the offchain SDK. The frontend generates a QR code, and Self's mobile app handles the verification. The backend receives the proof via webhook and verifies it server-side.

## Troubleshooting

- **Farcaster connector errors**: See `lib/wagmi-config.ts` for workarounds
- **Privy wallet not created**: Check `embeddedWallets.createOnLogin` config
- **Self verification fails**: Verify `NEXT_PUBLIC_SELF_ENDPOINT` is publicly accessible
- **Build errors**: Ensure all environment variables are set

## License

MIT
