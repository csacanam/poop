/**
 * API Client
 *
 * Helper functions to make API calls to the backend
 */

import { API_ENDPOINTS } from './api-config'

/**
 * Check if a user exists with the given wallet address
 */
export async function checkUser(address: string) {
  const response = await fetch(API_ENDPOINTS.users.check(address))
  
  if (!response.ok) {
    throw new Error(`Failed to check user: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Check if a username is available
 */
export async function checkUsername(username: string) {
  const response = await fetch(API_ENDPOINTS.users.checkUsername(username))
  
  if (!response.ok) {
    throw new Error(`Failed to check username: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Create a new user with wallet address and username
 */
export async function createUser(address: string, username: string, email?: string) {
  const response = await fetch(API_ENDPOINTS.users.create, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, username, email }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `Failed to create user: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Health check endpoint
 */
export async function checkHealth() {
  const response = await fetch(API_ENDPOINTS.health)
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`)
  }
  
  return response.json()
}

