# POOP Backend

Backend API server for the POOP (Proof of Onboarding Protocol) application.

## Environment Variables

Create a `.env` file in the root directory with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=8080  # Optional, defaults to 8080
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
- Body: `{ address: string, username: string }`
- Returns: `{ id: string, address: string, username: string, created_at: string }`

## Deployment

The server listens on the port specified by the `PORT` environment variable (defaults to 8080).

For Digital Ocean App Platform:

1. Set the source directory to `backend`
2. Ensure environment variables are set in the App Platform dashboard
3. The `Procfile` will automatically use `npm start` to run the server
