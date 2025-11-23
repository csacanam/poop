/**
 * Self Verification Route
 * 
 * Service endpoint for verifying Self Identity proofs:
 * - verifySelfProof: Verifies a Self Identity proof from the frontend
 */

import { SelfBackendVerifier, AllIds, DefaultConfigStore, AttestationId, ATTESTATION_ID } from '@selfxyz/core'
import { supabase } from '../config/supabase.js'

// Initialize Self verifier
const selfScope = process.env.SELF_SCOPE || 'poop-verification'
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ''
const selfEndpoint = backendUrl ? `${backendUrl}/api/self/verify` : ''
// Allow mock passports for testing (set SELF_MOCK_PASSPORT=false for production)
const mockPassport = process.env.SELF_MOCK_PASSPORT !== 'false' // Default to true (allow mocks)
const userIdentifierType = 'uuid' // We use UUID from users table

// Create allowed attestation IDs map (only passport and biometric ID card for now)
const allowedIds = new Map<AttestationId, boolean>([
  [ATTESTATION_ID.PASSPORT, true],
  [ATTESTATION_ID.BIOMETRIC_ID_CARD, true],
])

// Create config store with same settings as frontend
const configStore = new DefaultConfigStore({
  minimumAge: 18,
  excludedCountries: ['CUBA', 'IRAN', 'NORTH_KOREA', 'RUSSIA'],
  ofac: false,
})

if (!selfEndpoint) {
  console.warn('⚠️ [SELF] Self endpoint not configured. Self verification will not work.')
}

const selfBackendVerifier = selfEndpoint
  ? new SelfBackendVerifier(
      selfScope,
      selfEndpoint,
      mockPassport,
      allowedIds,
      configStore,
      userIdentifierType
    )
  : null

/**
 * Verify a Self Identity proof
 * This endpoint is called by Self's relayers after the user completes verification
 *
 * @param attestationId - The ID of the document being verified
 * @param proof - The zkSNARK proof object
 * @param publicSignals - Array of public signals from prover
 * @param userContextData - Contains user ID and app-defined user data
 * @returns Verification result
 */
export async function verifySelfProof(
  attestationId: number,
  proof: {
    a: [string, string]
    b: [[string, string], [string, string]]
    c: [string, string]
  },
  publicSignals: string[],
  userContextData: string
) {
  if (!selfBackendVerifier) {
    throw new Error('Self verification not configured')
  }

  if (!attestationId || !proof || !publicSignals || !userContextData) {
    throw new Error('Proof, publicSignals, attestationId and userContextData are required')
  }

  console.log('[SELF] Verifying proof', {
    attestationId,
    hasProof: !!proof,
    publicSignalsCount: publicSignals.length,
    userContextData: userContextData.substring(0, 50) + '...',
  })

  // Verify the proof
  const result = await selfBackendVerifier.verify(
    attestationId,
    proof,
    publicSignals,
    userContextData
  )

  console.log('[SELF] Verification result', {
    attestationId: result.attestationId,
    isValid: result.isValidDetails.isValid,
    isMinimumAgeValid: result.isValidDetails.isMinimumAgeValid,
    userIdentifier: result.userData?.userIdentifier,
    discloseOutput: result.discloseOutput,
    publicSignals: publicSignals.length,
  })

  // Check if verification is valid
  const { isValid, isMinimumAgeValid } = result.isValidDetails

  if (!isValid || !isMinimumAgeValid) {
    let reason = 'Verification failed'
    if (!isMinimumAgeValid) reason = 'Minimum age verification failed'
    throw new Error(reason)
  }

  // Extract user ID from userContextData
  // The userContextData contains the userId (UUID) we passed from the frontend
  const userId = result.userData?.userIdentifier

  if (!userId) {
    throw new Error('User identifier not found in verification result')
  }

  // For uniqueness verification, we use a combination of:
  // 1. The first public signal (which typically contains document uniqueness info)
  // 2. Or we can use a hash of the proof + publicSignals to ensure the same document isn't used twice
  // According to Self docs, the first public signal often contains document-specific uniqueness data
  const documentUniquenessId = publicSignals[0] || null

  if (documentUniquenessId) {
    // Check if this document has been used before (by checking self_uniqueness_id)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, self_uniqueness_id')
      .eq('self_uniqueness_id', documentUniquenessId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = not found, which is what we want
      console.error('[SELF] Error checking document uniqueness:', checkError)
      throw new Error(`Failed to check document uniqueness: ${checkError.message}`)
    }

    if (existingUser && existingUser.id !== userId) {
      // This document has been used by a different user
      throw new Error('This document has already been used by another user')
    }
  }

  // Update user's verified status and store uniqueness ID
  const updateData: any = {
    verified: true,
    updated_at: new Date().toISOString(),
  }

  // Store the document uniqueness ID if we have it
  if (documentUniquenessId) {
    updateData.self_uniqueness_id = documentUniquenessId
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (updateError) {
    console.error('[SELF] Error updating user verified status:', updateError)
    throw new Error(`Failed to update user verified status: ${updateError.message}`)
  }

  return {
    status: 'success',
    result: true,
    userId,
    attestationId: result.attestationId,
    discloseOutput: result.discloseOutput,
  }
}

