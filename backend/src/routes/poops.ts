/**
 * Poop Routes
 *
 * Service endpoints for POOP management:
 * - createPoop: Create a new POOP
 * - getUserPoops: Get all POOPs sent by a user (FUNDED or CLAIMED only)
 */

import { supabase } from '../config/supabase.js'
import { checkUser } from './users.js'

// Celo mainnet chain ID
const CELO_MAINNET_CHAIN_ID = 42220

/**
 * Create a new POOP
 *
 * @param senderAddress - Wallet address of the sender
 * @param recipientEmail - Email of the recipient
 * @param amount - Amount in USDC (as a number, will be stored with 6 decimals)
 * @returns Created POOP data
 */
export async function createPoop(senderAddress: string, recipientEmail: string, amount: number) {
  // Validation
  if (!senderAddress) {
    throw new Error('Sender address is required')
  }

  if (!recipientEmail) {
    throw new Error('Recipient email is required')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(recipientEmail.trim())) {
    throw new Error('Invalid recipient email format')
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  // Check if sender exists
  const senderCheck = await checkUser(senderAddress)
  if (!senderCheck.exists || !senderCheck.user) {
    throw new Error('Sender user not found. Please complete your profile first.')
  }

  const senderUserId = senderCheck.user.id

  // Create POOP in Supabase
  // Amount is stored with 6 decimals precision (numeric(20, 6))
  const { data: newPoop, error } = await supabase
    .from('poops')
    .insert({
      sender_user_id: senderUserId,
      recipient_email: recipientEmail.trim().toLowerCase(),
      amount: amount,
      chain_id: CELO_MAINNET_CHAIN_ID,
      state: 'CREATED',
    })
    .select('id, sender_user_id, recipient_email, amount, chain_id, state, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to create POOP: ${error.message}`)
  }

  return {
    id: newPoop.id,
    sender_user_id: newPoop.sender_user_id,
    recipient_email: newPoop.recipient_email,
    amount: Number(newPoop.amount),
    chain_id: newPoop.chain_id,
    state: newPoop.state,
    created_at: newPoop.created_at,
  }
}

/**
 * Get all POOPs sent by a user
 * Only returns POOPs in FUNDED or CLAIMED state, ordered by most recent first
 *
 * @param senderAddress - Wallet address of the sender (optional, can use username instead)
 * @param username - Username of the sender (optional, can use address instead)
 * @returns Array of POOP data
 */
export async function getUserPoops(senderAddress?: string, username?: string) {
  // At least one identifier is required
  if (!senderAddress && !username) {
    throw new Error('Either sender address or username is required')
  }

  // Find the user by address or username
  let userQuery = supabase.from('users').select('id')

  if (senderAddress) {
    userQuery = userQuery.eq('address', senderAddress)
  } else if (username) {
    userQuery = userQuery.eq('username', username.toLowerCase())
  }

  const { data: user, error: userError } = await userQuery.single()

  if (userError) {
    if (userError.code === 'PGRST116') {
      // User not found
      return []
    }
    throw new Error(`Failed to find user: ${userError.message}`)
  }

  if (!user) {
    return []
  }

  // Get all POOPs sent by this user, filtered by state (FUNDED, CLAIMED, or CANCELLED)
  const { data: poops, error: poopsError } = await supabase
    .from('poops')
    .select('id, sender_user_id, recipient_email, amount, chain_id, state, created_at, updated_at')
    .eq('sender_user_id', user.id)
    .in('state', ['FUNDED', 'CLAIMED', 'CANCELLED'])
    .order('created_at', { ascending: false })

  if (poopsError) {
    throw new Error(`Failed to fetch POOPs: ${poopsError.message}`)
  }

  // Format the response
  return poops.map((poop) => ({
    id: poop.id,
    sender_user_id: poop.sender_user_id,
    recipient_email: poop.recipient_email,
    amount: Number(poop.amount),
    chain_id: poop.chain_id,
    state: poop.state,
    created_at: poop.created_at,
    updated_at: poop.updated_at,
  }))
}

