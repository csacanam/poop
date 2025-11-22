// Mock wallet and transaction data for hackathon demo

export interface Token {
  symbol: string
  name: string
  balance: number
  fiatValue: number
  fiatCurrency: string
  icon: string
}

export interface Transaction {
  id: string
  type: "sent" | "received" | "claimed"
  status: "pending" | "claimed" | "failed"
  recipientName?: string
  recipientPhone?: string
  senderName?: string
  token: string
  amount: number
  fiatValue: number
  fiatCurrency: string
  date: string
  claimLink?: string
}

export const mockTokens: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 245.5,
    fiatValue: 245.5,
    fiatCurrency: "USD",
    icon: "💵",
  },
  {
    symbol: "cCOP",
    name: "Colombian Peso",
    balance: 580000,
    fiatValue: 580000,
    fiatCurrency: "COP",
    icon: "🇨🇴",
  },
  {
    symbol: "BRLA",
    name: "Brazilian Real",
    balance: 1250.75,
    fiatValue: 1250.75,
    fiatCurrency: "BRL",
    icon: "🇧🇷",
  },
  {
    symbol: "MXNB",
    name: "Mexican Peso",
    balance: 3450.0,
    fiatValue: 3450.0,
    fiatCurrency: "MXN",
    icon: "🇲🇽",
  },
  {
    symbol: "WARS",
    name: "Argentine Peso",
    balance: 125000,
    fiatValue: 125000,
    fiatCurrency: "ARS",
    icon: "🇦🇷",
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: "tx_1",
    type: "sent",
    status: "pending",
    recipientName: "Maria Silva",
    recipientPhone: "+55 11 99999-8888",
    token: "BRLA",
    amount: 50.0,
    fiatValue: 50.0,
    fiatCurrency: "BRL",
    date: "2025-01-09T14:30:00Z",
    claimLink: "https://giftcrypto.app/claim/tx_1",
  },
  {
    id: "tx_2",
    type: "sent",
    status: "claimed",
    recipientName: "Carlos Mendez",
    recipientPhone: "+52 55 1234-5678",
    token: "MXNB",
    amount: 500.0,
    fiatValue: 500.0,
    fiatCurrency: "MXN",
    date: "2025-01-08T10:15:00Z",
  },
  {
    id: "tx_3",
    type: "received",
    status: "claimed",
    senderName: "Ana Rodriguez",
    token: "USDC",
    amount: 25.0,
    fiatValue: 25.0,
    fiatCurrency: "USD",
    date: "2025-01-07T16:45:00Z",
  },
  {
    id: "tx_4",
    type: "sent",
    status: "failed",
    recipientName: "Pedro Santos",
    recipientPhone: "+57 300 123-4567",
    token: "cCOP",
    amount: 100000,
    fiatValue: 100000,
    fiatCurrency: "COP",
    date: "2025-01-06T09:20:00Z",
  },
]

export const mockGift = {
  id: "tx_1",
  senderName: "Anonymous Friend",
  token: "USDC",
  tokenIcon: "💵",
  amount: 50.0,
  fiatValue: 50.0,
  fiatCurrency: "USD",
  message: "Happy Birthday! 🎉",
  status: "pending" as const,
}

export interface UserRanking {
  rank: number
  address: string
  displayName: string
  onboardedUsers: number
  isCurrentUser?: boolean
}

export interface OnboardedUser {
  address: string
  displayName: string
  joinedDate: string
  firstGiftAmount: number
  status: "active" | "pending"
}

export const mockUserRankings: UserRanking[] = [
  {
    rank: 1,
    address: "0x1234...5678",
    displayName: "CryptoKing",
    onboardedUsers: 156,
  },
  {
    rank: 2,
    address: "0x9876...4321",
    displayName: "GiftMaster",
    onboardedUsers: 142,
  },
  {
    rank: 3,
    address: "0xabcd...ef01",
    displayName: "TokenSender",
    onboardedUsers: 128,
  },
  {
    rank: 4,
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    displayName: "You",
    onboardedUsers: 87,
    isCurrentUser: true,
  },
  {
    rank: 5,
    address: "0x2345...6789",
    displayName: "WhaleWallet",
    onboardedUsers: 76,
  },
  {
    rank: 6,
    address: "0x3456...7890",
    displayName: "MoonBoy",
    onboardedUsers: 65,
  },
  {
    rank: 7,
    address: "0x4567...8901",
    displayName: "DiamondHands",
    onboardedUsers: 54,
  },
]

export const mockOnboardedUsers: OnboardedUser[] = [
  {
    address: "0xabc1...2345",
    displayName: "Maria Silva",
    joinedDate: "2025-01-15T10:30:00Z",
    firstGiftAmount: 25.0,
    status: "active",
  },
  {
    address: "0xdef2...3456",
    displayName: "Carlos Mendez",
    joinedDate: "2025-01-14T14:20:00Z",
    firstGiftAmount: 50.0,
    status: "active",
  },
  {
    address: "0xghi3...4567",
    displayName: "Ana Rodriguez",
    joinedDate: "2025-01-12T09:15:00Z",
    firstGiftAmount: 30.0,
    status: "active",
  },
  {
    address: "0xjkl4...5678",
    displayName: "Pedro Santos",
    joinedDate: "2025-01-10T16:45:00Z",
    firstGiftAmount: 40.0,
    status: "pending",
  },
  {
    address: "0xmno5...6789",
    displayName: "Sofia Martinez",
    joinedDate: "2025-01-08T11:30:00Z",
    firstGiftAmount: 20.0,
    status: "active",
  },
]
