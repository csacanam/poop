# POOP Frontend

Frontend application for POOP (Proof of Onboarding Protocol) built with Next.js.

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_BACKEND_URL=your_backend_url_here
```

### For Vercel Deployment

Add the following environment variable in your Vercel project settings:

- **Key**: `NEXT_PUBLIC_BACKEND_URL`
- **Value**: Your backend API URL

You can add this in:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Or through Vercel CLI: `vercel env add NEXT_PUBLIC_BACKEND_URL`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Features

- **Wallet Connection**: Automatic connection via Farcaster Mini App
- **User Registration**: Automatic username/email collection when wallet is first connected
- **Username Validation**: Real-time username availability checking
- **USDC Balance**: Display USDC balance from Celo mainnet

## Project Structure

- `/app` - Next.js app router pages
- `/components` - React components
- `/hooks` - Custom React hooks
- `/lib` - Utilities and API clients
- `/blockchain` - Blockchain configuration (tokens, chains, etc.)
