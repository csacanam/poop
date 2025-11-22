/**
 * User Routes
 * 
 * Service endpoints for user management:
 * - checkUser: Check if user exists by wallet address
 * - checkUsername: Check if username is available
 * - createUser: Create a new user
 */

import { supabase } from '../config/supabase'

/**
 * Check if a user exists with the given wallet address
 * 
 * @param address - Wallet address to check
 * @returns User data if exists, null otherwise
 */
export async function checkUser(address: string) {
  if (!address) {
    throw new Error('Address is required')
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, address, username, email, self_uniqueness_id, created_at')
    .eq('address', address)
    .single()

  // PGRST116 = no rows returned (not found) - this is OK
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  if (!data) {
    return { exists: false, user: null }
  }

  return {
    exists: true,
    user: {
      id: data.id,
      address: data.address,
      username: data.username,
      hasUsername: !!data.username,
      email: data.email,
      self_uniqueness_id: data.self_uniqueness_id,
      created_at: data.created_at,
    },
  }
}

/**
 * Check if a username is available
 * 
 * @param username - Username to check
 * @returns Whether username is available
 */
export async function checkUsername(username: string) {
  if (!username) {
    throw new Error('Username is required')
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  if (!usernameRegex.test(username)) {
    throw new Error('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens')
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username.toLowerCase())
    .single()

  // PGRST116 = no rows returned (not found) - this means username is available
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`)
  }

  return {
    available: !data,
    username: username,
  }
}

/**
 * Create a new user with wallet address and username
 * 
 * @param address - Wallet address
 * @param username - Unique username
 * @returns Created user data
 */
export async function createUser(address: string, username: string) {
  // Validation
  if (!address) {
    throw new Error('Wallet address is required')
  }

  if (!username) {
    throw new Error('Username is required')
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  if (!usernameRegex.test(username)) {
    throw new Error('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens')
  }

  // Check if username is available
  const usernameCheck = await checkUsername(username)
  if (!usernameCheck.available) {
    throw new Error('Username already taken')
  }

  // Check if address already exists
  const userCheck = await checkUser(address)
  if (userCheck.exists) {
    throw new Error('Address already registered')
  }

  // Create user in Supabase
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      address: address,
      username: username.toLowerCase(),
    })
    .select('id, address, username, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return {
    id: newUser.id,
    address: newUser.address,
    username: newUser.username,
    created_at: newUser.created_at,
  }
}
