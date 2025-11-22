/**
 * Cancellation Processor Service
 *
 * Processes Cancelled events from PoopVault contract and updates POOP state in database
 */

import { supabase } from '../../config/supabase.js'

interface ProcessCancellationParams {
  poopId: string
  sender: string
  amount: string // Amount in human-readable format (e.g., "10.5")
  tokenSymbol: string
  txHash: string
  blockNumber: number
  chainId: number
}

/**
 * Process a Cancelled event from the PoopVault contract
 * Updates the POOP state to 'CANCELLED' in the database
 */
export async function processCancellation(params: ProcessCancellationParams) {
  const { poopId, sender, amount, tokenSymbol, txHash, blockNumber, chainId } = params

  console.log('🔄 [CANCELLATION:PROCESSING] Processing cancellation', {
    poopId,
    sender,
    amount: `${amount} ${tokenSymbol}`,
    txHash,
    blockNumber,
    chainId,
  })

  // Find the POOP by ID
  const { data: poop, error: fetchError } = await supabase
    .from('poops')
    .select('id, state, sender_user_id')
    .eq('id', poopId)
    .single()

  if (fetchError) {
    console.error('❌ [CANCELLATION:ERROR] Failed to fetch POOP', {
      poopId,
      error: fetchError.message,
    })
    throw new Error(`Failed to fetch POOP: ${fetchError.message}`)
  }

  if (!poop) {
    console.error('❌ [CANCELLATION:ERROR] POOP not found', { poopId })
    throw new Error(`POOP not found: ${poopId}`)
  }

  // Check if POOP is already cancelled
  if (poop.state === 'CANCELLED') {
    console.warn('⚠️ [CANCELLATION:WARNING] POOP already cancelled', {
      poopId,
      currentState: poop.state,
    })
    // Don't throw error, just log - idempotent operation
    return {
      success: true,
      message: 'POOP already cancelled',
      poopId,
      state: poop.state,
    }
  }

  // Cannot cancel if already claimed
  if (poop.state === 'CLAIMED') {
    console.error('❌ [CANCELLATION:ERROR] Cannot cancel already claimed POOP', {
      poopId,
      currentState: poop.state,
    })
    throw new Error(`Cannot cancel POOP: already claimed`)
  }

  // Update POOP state to CANCELLED
  const { data: updatedPoop, error: updateError } = await supabase
    .from('poops')
    .update({
      state: 'CANCELLED',
      tx_hash: txHash, // Store transaction hash
      block_number: blockNumber, // Store block number
      updated_at: new Date().toISOString(),
    })
    .eq('id', poopId)
    .select('id, state')
    .single()

  if (updateError) {
    console.error('❌ [CANCELLATION:ERROR] Failed to update POOP state', {
      poopId,
      error: updateError.message,
    })
    throw new Error(`Failed to update POOP state: ${updateError.message}`)
  }

  console.log('✅ [CANCELLATION:SUCCESS] POOP cancelled successfully', {
    poopId,
    previousState: poop.state,
    newState: updatedPoop.state,
    txHash,
  })

  return {
    success: true,
    message: 'POOP cancelled successfully',
    poopId,
    state: updatedPoop.state,
    txHash,
    blockNumber,
  }
}

