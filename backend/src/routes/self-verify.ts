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
const selfEndpoint = process.env.SELF_ENDPOINT || process.env.NEXT_PUBLIC_SELF_ENDPOINT || ''
const mockPassport = process.env.SELF_MOCK_PASSPORT === 'true' || process.env.NEXT_PUBLIC_SELF_ENDPOINT_TYPE?.includes('staging') || true // Default to staging for now
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

  // Update user's verified status in database
  const { error: updateError } = await supabase
    .from('users')
    .update({
      verified: true,
      updated_at: new Date().toISOString(),
    })
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

