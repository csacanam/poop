/**
 * Claim Route
 * 
 * Service endpoint for claiming POOPs:
 * - claimPoop: Claim a POOP by calling the contract claimFor function
 */

import { supabase } from '../config/supabase.js'
import { ethers } from 'ethers'
import { getPoopVaultAddress, POOP_VAULT_ABI } from '../blockchain/contracts.js'
import { PrivyClient } from '@privy-io/server-auth'

// Initialize Privy client
const privyAppId = process.env.PRIVY_APP_ID
const privyAppSecret = process.env.PRIVY_APP_SECRET

if (!privyAppId || !privyAppSecret) {
  console.warn('⚠️ [CLAIM] Privy credentials not configured. Claim endpoint will not work.')
}

const privyClient = privyAppId && privyAppSecret 
  ? new PrivyClient(privyAppId, privyAppSecret)
  : null

// Celo mainnet chain ID
const CELO_MAINNET_CHAIN_ID = 42220

/**
 * Claim a POOP by calling the contract claimFor function
 * Verifies Privy token, checks email match, and calls the contract
 *
 * @param accessToken - Privy access token from the frontend
 * @param poopId - UUID of the POOP to claim
 * @param walletAddress - Wallet address of the recipient
 * @returns Claim result
 */
export async function claimPoop(accessToken: string, poopId: string, walletAddress: string) {
  if (!privyClient) {
    throw new Error('Privy authentication not configured')
  }

  if (!accessToken) {
    throw new Error('Access token is required')
  }

  if (!poopId) {
    throw new Error('POOP ID is required')
  }

  if (!walletAddress) {
    throw new Error('Wallet address is required')
  }

  // Verify Privy token and get user info
  let userEmail: string | null = null
  try {
    const claims = await privyClient.verifyAuthToken(accessToken)
    // Get user ID from claims
    const userId = claims.userId
    if (!userId) {
      throw new Error('User ID not found in Privy token')
    }
    
    // Get user details from Privy to get email
    const user = await privyClient.getUser(userId)
    // Email is in linkedAccounts with type 'email'
    // The email account has a different structure - check for email type
    const emailAccount = user.linkedAccounts?.find((acc: any) => {
      return acc.type === 'email' || (acc as any).emailAddress
    })
    
    // Try different ways to get the email
    if (emailAccount) {
      userEmail = (emailAccount as any).emailAddress || (emailAccount as any).address || (emailAccount as any).email || null
    }
    
    // If still no email, check if user has email directly
    if (!userEmail && (user as any).email) {
      userEmail = (user as any).email
    }
    
    if (!userEmail) {
      throw new Error('Email not found in Privy user account')
    }
  } catch (error: any) {
    console.error('[CLAIM] Error verifying Privy token:', error)
    throw new Error(`Invalid or expired token: ${error.message}`)
  }

  // Verify the POOP exists and is in VERIFIED state
  const { data: poop, error: poopError } = await supabase
    .from('poops')
    .select('id, recipient_email, amount, chain_id, state, recipient_user_id')
    .eq('id', poopId)
    .single()

  if (poopError || !poop) {
    throw new Error(`POOP not found: ${poopError?.message || 'Unknown error'}`)
  }

  if (poop.state !== 'VERIFIED') {
    throw new Error(`POOP is not in VERIFIED state. Current state: ${poop.state}`)
  }

  // Verify the user's email matches the POOP recipient email
  if (userEmail.toLowerCase() !== poop.recipient_email.toLowerCase()) {
    throw new Error('User email does not match POOP recipient email')
  }

  // Verify the wallet address matches the recipient_user_id's address
  if (poop.recipient_user_id) {
    const { data: recipientUser, error: userError } = await supabase
      .from('users')
      .select('address')
      .eq('id', poop.recipient_user_id)
      .single()

    if (userError || !recipientUser) {
      throw new Error(`Failed to fetch recipient user: ${userError?.message || 'Unknown error'}`)
    }

    if (recipientUser.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Wallet address does not match recipient user address')
    }
  }

  // Get contract address for the chain
  const chainId = poop.chain_id || CELO_MAINNET_CHAIN_ID
  const contractAddress = getPoopVaultAddress(chainId)
  if (!contractAddress) {
    throw new Error(`PoopVault not deployed on chain ${chainId}`)
  }

  // Get RPC URL for the chain
  const rpcUrl = process.env.CELO_RPC_URL || 'https://forno.celo.org'
  if (!rpcUrl) {
    throw new Error('RPC URL not configured')
  }

  // Get owner private key (backend wallet that can call claimFor)
  const ownerPrivateKey = process.env.POOP_VAULT_OWNER_PRIVATE_KEY
  if (!ownerPrivateKey) {
    throw new Error('POOP_VAULT_OWNER_PRIVATE_KEY not configured')
  }

  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(ownerPrivateKey, provider)
  const contract = new ethers.Contract(contractAddress, POOP_VAULT_ABI, wallet)

  // Convert amount to wei (USDC has 6 decimals)
  const amountWei = ethers.parseUnits(poop.amount.toString(), 6)

  // Call claimFor on the contract
  console.log(`[CLAIM] Calling claimFor on contract`, {
    contractAddress,
    chainId,
    to: walletAddress,
    amount: poop.amount,
    amountWei: amountWei.toString(),
    poopId,
  })

  let txHash: string
  try {
    const tx = await contract.claimFor(
      walletAddress,
      amountWei,
      poopId
    )
    
    console.log(`[CLAIM] Transaction sent: ${tx.hash}`)
    txHash = tx.hash

    // Wait for transaction confirmation
    const receipt = await tx.wait()
    console.log(`[CLAIM] Transaction confirmed: ${receipt.hash}`)
  } catch (error: any) {
    console.error('[CLAIM] Error calling contract:', error)
    throw new Error(`Failed to claim on contract: ${error.message}`)
  }

  // Update POOP state to CLAIMED
  const { error: updateError } = await supabase
    .from('poops')
    .update({
      state: 'CLAIMED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', poopId)

  if (updateError) {
    console.error('[CLAIM] Error updating POOP state:', updateError)
    // Don't throw - the contract call succeeded, state update is secondary
    // But log it for manual fix if needed
  }

  return {
    success: true,
    poopId,
    walletAddress,
    amount: poop.amount,
    txHash,
    state: 'CLAIMED',
  }
}

