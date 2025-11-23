# POOP Backend

Backend API server for the POOP (Proof of Onboarding Protocol) application. Built with Express.js and TypeScript.

## Overview

The backend handles:
- User management (creation, lookup, profile)
- POOP lifecycle management (creation, state updates, claims)
- Real-time blockchain event processing via Alchemy webhooks
- Self identity verification (offchain SDK)
- Privy authentication token verification
- Smart contract interactions (claiming POOPs)

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=8080  # Optional, defaults to 8080

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Alchemy Webhook Signing Keys (for webhook signature verification)
ALCHEMY_WEBHOOK_SIGNING_KEY_DEPOSIT=your_deposit_webhook_signing_key_from_alchemy
ALCHEMY_WEBHOOK_SIGNING_KEY_CANCELLED=your_cancelled_webhook_signing_key_from_alchemy

# Privy (for claim authentication)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Self (for identity verification)
SELF_SCOPE=poop-verification  # Optional, defaults to "poop-verification"
SELF_MOCK_PASSPORT=true  # Set to "false" for production

# Blockchain
CELO_RPC_URL=https://forno.celo.org  # Optional, has default
POOP_VAULT_OWNER_PRIVATE_KEY=your_backend_wallet_private_key  # For claimFor function

# Backend URL (for Self endpoint construction)
BACKEND_URL=https://your-backend-url.com  # Optional, will be constructed from request if not set
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The server will start on `http://localhost:8080` (or the port specified in `PORT`).

## Build

```bash
npm run build
```

## Start (Production)

```bash
npm start
```

## API Endpoints

### Health Check

- `GET /health` - Returns server status

### User Management

#### Check User by Address
- `GET /api/users/check?address=0x...`
- Returns: `{ exists: boolean, user: User | null }`

#### Check User by Email
- `GET /api/users/check-email?email=user@example.com`
- Returns: `{ exists: boolean, user: User | null }`
- Includes `verified` field for Self verification status

#### Check Username Availability
- `GET /api/users/check-username?username=testuser`
- Returns: `{ available: boolean, username: string }`

#### Create User
- `POST /api/users`
- Body: `{ address: string, username: string, email?: string }`
- Returns: `{ id: string, address: string, username: string, email: string | null, created_at: string }`

### POOP Management

#### Create POOP
- `POST /api/poops`
- Body: `{ senderAddress: string, recipientEmail: string, amount: number }`
- Returns: `{ id: string, sender_user_id: string, recipient_email: string, amount: number, chain_id: number, state: string, created_at: string }`

#### Get User's POOPs (Sent)
- `GET /api/poops/user?address=0x...&username=testuser`
- Returns: Array of POOPs sent by the user

#### Get Recipient POOPs (Pending Claims)
- `GET /api/poops/recipient?email=user@example.com`
- Returns: Array of POOPs available for claiming (states: `FUNDED`, `VERIFIED`)
- Used by the claim flow to find pending gifts

#### Verify User and Associate POOP
- `POST /api/poops/verify`
- Body: `{ userId: string, poopId: string }`
- Verifies user's Self verification and associates POOP with user
- Updates POOP state from `FUNDED` to `VERIFIED`
- Returns: `{ success: boolean, userId: string, poopId: string, verified: boolean, poopState: string }`

#### Claim POOP
- `POST /api/poops/claim`
- Headers: `Authorization: Bearer <privy_access_token>`
- Body: `{ poopId: string, walletAddress: string }`
- Verifies Privy token, checks email match, ensures POOP is in `VERIFIED` state
- Calls `claimFor` on PoopVault contract
- Updates POOP state to `CLAIMED`
- Returns: `{ success: boolean, poopId: string, txHash: string, state: string }`

### Self Verification

#### Verify Self Proof
- `POST /api/self/verify`
- Called by Self's relayers after user completes verification
- Body: `{ attestationId: number, proof: object, publicSignals: string[], userContextData: string }`
- Verifies zero-knowledge proof using `@selfxyz/core`
- Updates user's `verified` status and stores `self_uniqueness_id`
- Returns: `{ status: string, result: boolean, userId: string }`

**Note:** Self may call this endpoint without a proof to validate endpoint availability. The endpoint returns success in this case.

### Webhooks

#### Alchemy Deposit Webhook
- `POST /api/webhooks/alchemy/deposit`
- Receives Deposit events from PoopVault contract
- Automatically updates POOP state from `CREATED` to `FUNDED` when deposit is confirmed
- Requires `x-alchemy-signature` header for verification

#### Alchemy Cancelled Webhook
- `POST /api/webhooks/alchemy/cancelled`
- Receives Cancelled events from PoopVault contract
- Automatically updates POOP state to `CANCELLED` when cancellation is confirmed
- Requires `x-alchemy-signature` header for verification

## Setting Up Alchemy Webhooks

See detailed instructions in the [Alchemy Webhooks Setup Guide](#alchemy-webhooks-setup) below.

## Self Verification Setup

1. **Get Self Credentials**
   - Sign up at [self.xyz](https://self.xyz)
   - Create an app and get your scope identifier
   - Set `SELF_SCOPE` in your `.env` file

2. **Configure Endpoint**
   - The endpoint `/api/self/verify` must be publicly accessible
   - Self's relayers will POST to this endpoint
   - The endpoint is dynamically constructed from the request if `BACKEND_URL` is not set

3. **Verification Flow**
   - Frontend uses `@selfxyz/qrcode` SDK to generate QR code
   - User scans QR code with Self mobile app
   - Self generates zero-knowledge proof
   - Self's relayers POST proof to `/api/self/verify`
   - Backend verifies proof using `@selfxyz/core`
   - User's `verified` field is set to `true`

## Privy Integration

The backend uses Privy for authentication in the claim flow:

1. **Token Verification**
   - Frontend sends Privy access token in `Authorization` header
   - Backend verifies token using `@privy-io/server-auth`
   - Extracts user email from Privy user data

2. **Email Matching**
   - Verifies that Privy user email matches POOP recipient email
   - Ensures only the intended recipient can claim

## Database Schema

The backend uses Supabase (PostgreSQL) with the following key tables:

- **users**: User profiles (address, username, email, verified, self_uniqueness_id)
- **poops**: POOP records (sender, recipient, amount, state, chain_id)
- **poop_state** enum: `CREATED`, `FUNDED`, `VERIFIED`, `CLAIMED`, `CANCELLED`

See `src/config/schema.sql` for the complete schema.

## Alchemy Webhooks Setup

### Step 1: Get Your Alchemy API Key

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Create or select your app for Celo Mainnet
3. Copy your API key

### Step 2: Create GraphQL Webhooks

Create two webhooks in Alchemy Dashboard:

#### Deposit Webhook

1. Go to **Webhooks** section
2. Click **Create Webhook**
3. Select **GraphQL**
4. Choose **Celo Mainnet**
5. Use the GraphQL query from `docs/alchemy-webhook-query-simple.graphql`
6. Set webhook URL: `https://your-backend-url.com/api/webhooks/alchemy/deposit`
7. Copy the signing key

#### Cancelled Webhook

1. Create a second webhook
2. Use the GraphQL query from `docs/alchemy-webhook-query-cancelled.graphql`
3. Set webhook URL: `https://your-backend-url.com/api/webhooks/alchemy/cancelled`
4. Copy the signing key

### Step 3: Configure Environment Variables

Add the signing keys to your `.env`:

```env
ALCHEMY_WEBHOOK_SIGNING_KEY_DEPOSIT=your_deposit_webhook_signing_key
ALCHEMY_WEBHOOK_SIGNING_KEY_CANCELLED=your_cancelled_webhook_signing_key
```

### Step 4: Test

1. Make a deposit via the frontend
2. Check backend logs for webhook processing
3. Verify POOP state updated to `FUNDED` in database

## Deployment

The server listens on the port specified by the `PORT` environment variable (defaults to 8080).

### Digital Ocean App Platform

1. Set source directory to `backend`
2. Configure environment variables in dashboard
3. The `Procfile` automatically uses `npm start`

### Other Platforms

Ensure:
- Node.js 18+ is available
- Environment variables are set
- The server can receive HTTPS requests (for webhooks and Self verification)

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── config/
│   │   ├── supabase.ts       # Supabase client
│   │   └── schema.sql        # Database schema
│   ├── routes/
│   │   ├── users.ts          # User management
│   │   ├── poops.ts          # POOP management
│   │   ├── claim.ts          # Claim processing
│   │   ├── self-verify.ts    # Self verification
│   │   └── webhooks.ts       # Alchemy webhook handlers
│   └── blockchain/
│       ├── contracts.ts      # Contract addresses and ABIs
│       └── services/
│           ├── DepositProcessor.ts
│           └── CancellationProcessor.ts
├── docs/                      # GraphQL queries for webhooks
└── package.json
```

## Troubleshooting

- **Webhook signature errors**: Verify signing keys match Alchemy dashboard
- **Self verification fails**: Ensure endpoint is publicly accessible via HTTPS
- **Privy token errors**: Check `PRIVY_APP_ID` and `PRIVY_APP_SECRET` are correct
- **Contract claim fails**: Verify `POOP_VAULT_OWNER_PRIVATE_KEY` has sufficient balance for gas
