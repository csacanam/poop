/**
 * Deposit Processor Service
 *
 * Processes Deposit events from PoopVault contract and updates POOP state in database
 */

import { supabase } from '../../config/supabase.js'

interface ProcessDepositParams {
  poopId: string
  sender: string
  amount: string // Amount in human-readable format (e.g., "10.5")
  tokenSymbol: string
  txHash: string
  blockNumber: number
  chainId: number
}

/**
 * Process a Deposit event from the PoopVault contract
 * Updates the POOP state from 'CREATED' to 'FUNDED' in the database
 */
export async function processDeposit(params: ProcessDepositParams) {
  const { poopId, sender, amount, tokenSymbol, txHash, blockNumber, chainId } = params

  console.log('🔄 [DEPOSIT:PROCESSING] Processing deposit', {
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
    console.error('❌ [DEPOSIT:ERROR] Failed to fetch POOP', {
      poopId,
      error: fetchError.message,
    })
    throw new Error(`Failed to fetch POOP: ${fetchError.message}`)
  }

  if (!poop) {
    console.error('❌ [DEPOSIT:ERROR] POOP not found', { poopId })
    throw new Error(`POOP not found: ${poopId}`)
  }

  // Check if POOP is already funded
  if (poop.state === 'FUNDED') {
    console.warn('⚠️ [DEPOSIT:WARNING] POOP already funded', {
      poopId,
      currentState: poop.state,
    })
    // Don't throw error, just log - idempotent operation
    return {
      success: true,
      message: 'POOP already funded',
      poopId,
      state: poop.state,
    }
  }

  // Verify the state is CREATED before updating to FUNDED
  if (poop.state !== 'CREATED') {
    console.error('❌ [DEPOSIT:ERROR] Invalid POOP state for funding', {
      poopId,
      currentState: poop.state,
      expectedState: 'CREATED',
    })
    throw new Error(`Invalid POOP state: expected CREATED, got ${poop.state}`)
  }

  // Update POOP state to FUNDED
  const { data: updatedPoop, error: updateError } = await supabase
    .from('poops')
    .update({
      state: 'FUNDED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', poopId)
    .select('id, state')
    .single()

  if (updateError) {
    console.error('❌ [DEPOSIT:ERROR] Failed to update POOP state', {
      poopId,
      error: updateError.message,
    })
    throw new Error(`Failed to update POOP state: ${updateError.message}`)
  }

  console.log('✅ [DEPOSIT:SUCCESS] POOP funded successfully', {
    poopId,
    previousState: poop.state,
    newState: updatedPoop.state,
    txHash,
  })

  return {
    success: true,
    message: 'POOP funded successfully',
    poopId,
    state: updatedPoop.state,
    txHash,
    blockNumber,
  }
}

