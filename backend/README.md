# POOP Backend

Backend API server for the POOP (Proof of Onboarding Protocol) application.

## Environment Variables

Create a `.env` file in the root directory with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=8080  # Optional, defaults to 8080

# Alchemy Webhook Signing Keys (for webhook signature verification)
# You can use a single key for all chains, or chain-specific keys
ALCHEMY_WEBHOOK_SIGNING_KEY=your_alchemy_webhook_signing_key
# Or chain-specific keys:
# ALCHEMY_WEBHOOK_SIGNING_KEY_42220=your_key_for_celo_mainnet
# ALCHEMY_WEBHOOK_SIGNING_KEY_11142220=your_key_for_celo_sepolia
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start

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

### Webhooks

#### Alchemy Deposit Webhook

- `POST /api/webhooks/alchemy/deposit`
- Receives Deposit events from PoopVault contract
- Automatically updates POOP state from 'CREATED' to 'FUNDED' when deposit is confirmed
- Requires `x-alchemy-signature` header for verification

#### Alchemy Cancelled Webhook

- `POST /api/webhooks/alchemy/cancelled`
- Receives Cancelled events from PoopVault contract
- Automatically updates POOP state to 'CANCELLED' when cancellation is confirmed
- Requires `x-alchemy-signature` header for verification

## Setting Up Alchemy Webhooks

To receive real-time notifications when deposits are made to the PoopVault contract, you need to configure an Alchemy webhook.

### Step 1: Get Your Alchemy API Key

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Create or select your app for Celo Mainnet
3. Copy your API key

### Step 2: Create a GraphQL Webhook in Alchemy

1. In the Alchemy Dashboard, go to **Webhooks** section
2. Click **Create Webhook**
3. Select **GraphQL** as the webhook type
4. Choose your network: **Celo Mainnet** (or Celo Sepolia for testing)
5. Configure the webhook with the following GraphQL query:

```graphql
{
  block {
    hash
    number
    timestamp
    logs(
      filter: {
        addresses: ["0xA8d036fd3355C9134b5A6Ba837828FAa47fC8CCf"]
        topics: [
          "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b"
        ]
      }
    ) {
      data
      topics
      index
      account {
        address
      }
      transaction {
        hash
        status
      }
    }
  }
}
```

**Note:** If you get a "Read Timeout" error, try this simplified version first. The full query with all transaction fields is available in `docs/alchemy-webhook-query.graphql`, but it may cause timeouts on some networks.

**Contract addresses:**

- Celo Mainnet: `0xA8d036fd3355C9134b5A6Ba837828FAa47fC8CCf`
- Celo Sepolia: `0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8`

**Event topic[0] (Deposit event signature hash):** `0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b`

**Note:** The topic[0] is the same for both networks since it's the hash of the event signature `Deposit(address,uint256,string)`. For Celo Sepolia, just change the address in the `addresses` array.

A complete example with all transaction fields is available in `docs/alchemy-webhook-query.graphql`. A simplified version is in `docs/alchemy-webhook-query-simple.graphql`.

### Setting Up Cancelled Event Webhook

To receive notifications when POOPs are cancelled, create a second webhook with the following GraphQL query:

```graphql
{
  block {
    hash
    number
    timestamp
    logs(
      filter: {
        addresses: ["0xA8d036fd3355C9134b5A6Ba837828FAa47fC8CCf"]
        topics: ["0x227769bab1f1964756253845348433adc8394207b1a7e9d88f32e96ae50bf225"]
      }
    ) {
      data
      topics
      index
      account {
        address
      }
      transaction {
        hash
        status
      }
    }
  }
}
```

**Event topic[0] (Cancelled event signature hash):** `0x227769bab1f1964756253845348433adc8394207b1a7e9d88f32e96ae50bf225`

**Note:** The topic[0] is the same for both networks since it's the hash of the event signature `Cancelled(address,uint256,string)`. For Celo Sepolia, just change the address in the `addresses` array.

A complete example is available in `docs/alchemy-webhook-query-cancelled.graphql`.

6. Set the webhook URL to your backend endpoint:

   ```
   https://your-backend-url.com/api/webhooks/alchemy/deposit
   ```

   **Important:**

   - The URL must use **HTTPS** (not HTTP)
   - The URL must be **publicly accessible** (not localhost)
   - The full path is: `/api/webhooks/alchemy/deposit`

   **Example URLs:**

   - Digital Ocean: `https://your-app-name.ondigitalocean.app/api/webhooks/alchemy/deposit`
   - Custom domain: `https://api.yourdomain.com/api/webhooks/alchemy/deposit`
   - Railway/Render: `https://your-app-name.up.railway.app/api/webhooks/alchemy/deposit`

7. Copy the **Signing Key** from the webhook configuration page

### Step 3: Configure Environment Variables

Add the signing key to your `.env` file:

```env
# Single key for all chains (recommended for simplicity)
ALCHEMY_WEBHOOK_SIGNING_KEY=your_signing_key_from_alchemy

# Or chain-specific keys (if you have separate webhooks per chain)
ALCHEMY_WEBHOOK_SIGNING_KEY_42220=your_key_for_celo_mainnet
ALCHEMY_WEBHOOK_SIGNING_KEY_11142220=your_key_for_celo_sepolia
```

### Step 4: Test the Webhook

1. Make a deposit to the PoopVault contract (via the frontend)
2. Check your backend logs - you should see:

   ```
   🔔 [WEBHOOK:RECEIVED] Incoming request at ...
   📥 [WEBHOOK:PROCESSING] Processing webhook
   ✅ [WEBHOOK:DECODED] Deposit event decoded
   ✅ [DEPOSIT:SUCCESS] POOP funded successfully
   ```

3. Verify the POOP state was updated in your database from `CREATED` to `FUNDED`

### Webhook Event Format

The webhook receives Deposit events with the following structure:

```solidity
event Deposit(address indexed sender, uint256 amount, string poopId)
```

The webhook will:

1. Verify the signature for security
2. Decode the Deposit event
3. Extract `poopId`, `sender`, and `amount`
4. Update the POOP state from `CREATED` to `FUNDED` in the database
5. Log all operations for debugging

### Troubleshooting

- **Invalid signature error**: Make sure the `ALCHEMY_WEBHOOK_SIGNING_KEY` matches the signing key from Alchemy dashboard
- **No logs received**: Verify the contract address in the GraphQL query matches your deployed contract
- **POOP not found**: Ensure the `poopId` in the event matches a POOP ID in your database
- **State already FUNDED**: The webhook is idempotent - it won't error if the POOP is already funded

## Deployment

The server listens on the port specified by the `PORT` environment variable (defaults to 8080).

For Digital Ocean App Platform:

1. Set the source directory to `backend`
2. Ensure environment variables are set in the App Platform dashboard
3. The `Procfile` will automatically use `npm start` to run the server
