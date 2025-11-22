/**
 * Poop Routes
 *
 * Service endpoints for POOP management:
 * - createPoop: Create a new POOP
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

