/**
 * Self Verification Route
 * 
 * Service endpoint for verifying Self Identity proofs:
 * - verifySelfProof: Verifies a Self Identity proof from the frontend
 */

import { SelfBackendVerifier, AllIds, DefaultConfigStore, AttestationId } from '@selfxyz/core'
import { supabase } from '../config/supabase.js'

// Initialize Self verifier configuration
const selfScope = process.env.SELF_SCOPE || 'poop-verification'
// Allow mock passports for testing (set SELF_MOCK_PASSPORT=false for production)
const mockPassport = process.env.SELF_MOCK_PASSPORT !== 'false' // Default to true (allow mocks)
const userIdentifierType = 'uuid' // We use UUID from users table

// Note: We'll construct the endpoint dynamically in the handler
// to match the example pattern and ensure it's always available

// Create allowed attestation IDs map (only passport and biometric ID card for now)
// AttestationId enum values: 1 = PASSPORT, 2 = BIOMETRIC_ID_CARD
const allowedIds = new Map<AttestationId, boolean>([
  [1, true], // PASSPORT
  [2, true], // BIOMETRIC_ID_CARD
])

// Create config store - only verify humanity, no age or country restrictions
const configStore = new DefaultConfigStore({
  // Don't set minimumAge - allows any age
  // Don't set excludedCountries - allows all countries
  ofac: false, // OFAC sanctions check disabled
})

// Helper function to create SelfBackendVerifier with endpoint from request
function createSelfBackendVerifier(endpoint: string) {
  return new SelfBackendVerifier(
    selfScope,
    endpoint,
    mockPassport,
    allowedIds,
    configStore,
    userIdentifierType
  )
}

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
  attestationId: AttestationId,
  proof: {
    a: [string, string]
    b: [[string, string], [string, string]]
    c: [string, string]
  },
  publicSignals: string[],
  userContextData: string,
  endpoint?: string // Optional endpoint, will be constructed if not provided
) {
  // Construct endpoint if not provided
  const verifyEndpoint = endpoint || (() => {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ''
    if (!backendUrl) {
      throw new Error('BACKEND_URL or NEXT_PUBLIC_BACKEND_URL must be configured')
    }
    return `${backendUrl}/api/self/verify`
  })()
  
  // Create verifier instance
  const selfBackendVerifier = createSelfBackendVerifier(verifyEndpoint)

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
  // Since we're not requiring minimum age, we only check isValid
  const { isValid } = result.isValidDetails

  if (!isValid) {
    throw new Error('Verification failed')
  }

  // Extract user ID from userContextData
  // The userContextData contains the userId (UUID) we passed from the frontend
  const userId = result.userData?.userIdentifier

  if (!userId) {
    throw new Error('User identifier not found in verification result')
  }

  // For uniqueness verification, we use the nullifier from discloseOutput
  // The nullifier is a unique identifier for the document that ensures the same document
  // cannot be used twice, even across different users or applications
  const documentUniquenessId = result.discloseOutput?.nullifier || null

  if (documentUniquenessId) {
    // Convert nullifier to string if it's a number (it's typically a big number string)
    const nullifierString = String(documentUniquenessId)
    
    console.log('[SELF] Using nullifier as uniqueness ID:', nullifierString)
    
    // Check if this document has been used before (by checking self_uniqueness_id)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, self_uniqueness_id')
      .eq('self_uniqueness_id', nullifierString)
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
  } else {
    console.warn('[SELF] No nullifier found in discloseOutput, skipping uniqueness check')
  }

  // CRITICAL: Check if this user has already verified and claimed a POOP
  // This prevents the same person from being onboarded multiple times
  const { data: existingVerifiedPoops, error: checkVerifiedError } = await supabase
    .from('poops')
    .select('id, state')
    .eq('recipient_user_id', userId)
    .in('state', ['VERIFIED', 'CLAIMED'])

  if (checkVerifiedError) {
    console.error('[SELF] Error checking existing verified POOPs:', checkVerifiedError)
    throw new Error(`Failed to check existing verified POOPs: ${checkVerifiedError.message}`)
  }

  if (existingVerifiedPoops && existingVerifiedPoops.length > 0) {
    throw new Error('This user has already been onboarded. Each person can only verify one POOP.')
  }

  // Update user's verified status and store uniqueness ID
  const updateData: any = {
    verified: true,
    updated_at: new Date().toISOString(),
  }

  // Store the document uniqueness ID (nullifier) if we have it
  if (documentUniquenessId) {
    updateData.self_uniqueness_id = String(documentUniquenessId)
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

