# 💩 POOP — Proof of Onboarding Protocol

POOP is a decentralized onboarding protocol that enables crypto-native users to send USDC gifts to anyone via email, with built-in proof-of-humanity verification. The protocol creates verifiable proof that real humans were onboarded, making it perfect for community growth, referral programs, and incentivized onboarding campaigns.

## 🎯 Overview

POOP works in two main flows:

### Sender Flow (Farcaster Mini App)
1. Users connect their Farcaster wallet in a Farcaster Mini App
2. Enter recipient's email and amount
3. Deposit USDC into the PoopVault smart contract on Celo Mainnet
4. System generates a unique claim link

### Recipient Flow (Web Claim)
1. Recipients receive an email with a claim link (`/claim`)
2. Log in with Privy (email-only authentication)
3. Complete profile setup (nickname, email)
4. Verify humanity using Self's zero-knowledge identity verification
5. Claim USDC to any Celo wallet address

## 🏗️ Architecture

This repository contains three main components:

- **`contracts/`** - Smart contracts (Foundry/Solidity)
  - `PoopVault.sol` - Main vault contract for managing deposits and claims
  - Deployed on Celo Mainnet: `0x5333e149dede89095566dbde28c8179d62a68016`

- **`backend/`** - Express.js API server (TypeScript)
  - User management
  - POOP state management (Supabase)
  - Alchemy webhooks for blockchain events
  - Self identity verification
  - Privy authentication
  - Claim processing

- **`frontend/`** - Next.js web application
  - Farcaster Mini App (sender flow)
  - Web claim flow (recipient flow)
  - Privy email authentication
  - Self verification integration
  - Wallet connection and management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Foundry (for contracts)
- Supabase account
- Alchemy account (for webhooks)
- Privy account (for email auth)
- Self account (for identity verification)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/csacanam/poop.git
   cd poop
   ```

2. **Set up contracts**
   ```bash
   cd contracts
   forge install
   # Configure .env with PRIVATE_KEY, CELO_RPC_URL, etc.
   forge build
   ```

3. **Set up backend**
   ```bash
   cd backend
   npm install
   # Configure .env with Supabase, Alchemy, Privy, Self credentials
   npm run dev
   ```

4. **Set up frontend**
   ```bash
   cd frontend
   npm install
   # Configure .env.local with backend URL, Privy App ID, Self config
   npm run dev
   ```

See individual READMEs in each directory for detailed setup instructions.

## 📚 Documentation

- [Backend README](./backend/README.md) - API endpoints, webhooks, Self verification
- [Contracts README](./contracts/README.md) - Smart contract deployment and testing
- [Frontend README](./frontend/README.md) - Frontend setup and features

## 🔗 Key Integrations

- **Farcaster** - Mini App wallet connector for sender flow
- **Celo** - Blockchain network (Celo Mainnet)
- **USDC** - ERC20 token for gifts
- **Privy** - Email authentication and embedded wallet creation
- **Self** - Zero-knowledge identity verification (offchain SDK)
- **Alchemy** - Real-time blockchain event webhooks
- **Supabase** - Database for users and POOP state

## 📄 License

MIT — open for anyone to build on top of POOP.

---

**POOP = Proof Of Onboarding Protocol**  
Real humans. Real onboarding. Real growth. 🌍💡
