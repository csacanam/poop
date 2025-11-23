/**
 * API Configuration
 *
 * Centralized configuration for API endpoints
 */

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

/**
 * Get the base URL for backend API calls
 */
export function getBackendUrl(): string {
  return backendUrl
}

/**
 * Build a full API URL from a path
 * @param path - API path (e.g., '/api/users')
 * @returns Full URL to the API endpoint
 */
export function apiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${backendUrl}/${cleanPath}`
}

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  health: apiUrl('health'),
  users: {
    check: (address: string) => apiUrl(`api/users/check?address=${encodeURIComponent(address)}`),
    checkUsername: (username: string) => apiUrl(`api/users/check-username?username=${encodeURIComponent(username)}`),
    checkEmail: (email: string) => apiUrl(`api/users/check-email?email=${encodeURIComponent(email)}`),
    create: apiUrl('api/users'),
  },
  poops: {
    create: apiUrl('api/poops'),
    list: apiUrl('api/poops'),
    getRecipient: apiUrl('api/poops/recipient'),
  },
} as const

