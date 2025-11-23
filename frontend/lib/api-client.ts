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
 * Check if a user exists with the given email
 */
export async function checkUserByEmail(email: string) {
  const response = await fetch(API_ENDPOINTS.users.checkEmail(email))
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `Failed to check user by email: ${response.statusText}`)
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

/**
 * Create a new POOP
 */
export async function createPoop(senderAddress: string, recipientEmail: string, amount: number) {
  try {
    const response = await fetch(API_ENDPOINTS.poops.create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ senderAddress, recipientEmail, amount }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to create POOP: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    // Handle network errors (connection closed, timeout, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection and try again.')
    }
    throw error
  }
}

/**
 * Get all POOPs sent by a user
 * Only returns POOPs in FUNDED or CLAIMED state
 */
export async function getUserPoops(address?: string, username?: string) {
  try {
    const params = new URLSearchParams()
    if (address) params.append('address', address)
    if (username) params.append('username', username)

    const response = await fetch(`${API_ENDPOINTS.poops.list}?${params.toString()}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to fetch POOPs: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection and try again.')
    }
    throw error
  }
}

/**
 * Verify user and associate them as recipient of a POOP
 */
export async function verifyUserAndAssociatePoop(userId: string, poopId: string) {
  try {
    const response = await fetch(API_ENDPOINTS.poops.verify, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, poopId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to verify user: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection and try again.')
    }
    throw error
  }
}

/**
 * Get POOPs pending for a recipient email (FUNDED state only)
 */
export async function getRecipientPoops(email: string) {
  try {
    const params = new URLSearchParams()
    params.append('email', email)

    const response = await fetch(`${API_ENDPOINTS.poops.getRecipient}?${params.toString()}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to fetch recipient POOPs: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection and try again.')
    }
    throw error
  }
}

