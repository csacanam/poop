/**
 * Webhook Routes
 *
 * Service endpoints for receiving blockchain event notifications from Alchemy:
 * - /api/webhooks/alchemy/deposit: Receives Deposit events from PoopVault contract
 * - /api/webhooks/alchemy/cancelled: Receives Cancelled events from PoopVault contract
 */

import { Request, Response } from 'express'
import { ethers } from 'ethers'
import crypto from 'crypto'
import { processDeposit } from '../blockchain/services/DepositProcessor.js'
import { processCancellation } from '../blockchain/services/CancellationProcessor.js'
import { POOP_VAULT_ADDRESSES } from '../blockchain/contracts.js'

// ABI for event decoding
const DEPOSIT_EVENT_ABI = [
  'event Deposit(address indexed sender, uint256 amount, string poopId)',
]

const CANCELLED_EVENT_ABI = [
  'event Cancelled(address indexed sender, uint256 amount, string poopId)',
]

// Interface for Alchemy webhook payload (GraphQL format)
interface AlchemyWebhookPayload {
  webhookId: string
  id: string
  createdAt: string
  type: string
  event: {
    network: string
    sequenceNumber: string
    data: {
      block: {
        hash: string
        number: number
        timestamp: number
        logs: Array<{
          data: string
          topics: string[]
          index: number
          account: {
            address: string
          }
          transaction: {
            hash: string
            status: number
          }
        }>
      }
    }
  }
}

/**
 * Verify Alchemy webhook signature
 */
function verifyAlchemySignature(
  body: string,
  signature: string | undefined,
  signingKey: string
): boolean {
  if (!signature) {
    return false
  }

  const hmac = crypto.createHmac('sha256', signingKey)
  hmac.update(body)
  const digest = hmac.digest('hex')

  return signature === digest
}

/**
 * Get chain ID from network name
 */
function getChainIdFromNetwork(network: string): number | null {
  // Alchemy network names can be in different formats:
  // - 'CELO_MAINNET', 'CELO_MAINNET_MAINNET' (uppercase with underscores)
  // - 'celo-mainnet', 'celo-sepolia' (lowercase with hyphens)
  const normalizedNetwork = network.toLowerCase().replace(/_/g, '-')
  
  const networkMap: Record<string, number> = {
    'celo-mainnet': 42220,
    'celo-sepolia': 11142220,
    'celo-mainnet-mainnet': 42220, // Some Alchemy formats use this
  }

  return networkMap[normalizedNetwork] || null
}

/**
 * Get token symbol and decimals for a chain
 */
function getTokenInfo(chainId: number): { symbol: string; decimals: number } | null {
  // USDC on Celo uses 6 decimals
  const tokenInfo: Record<number, { symbol: string; decimals: number }> = {
    42220: { symbol: 'USDC', decimals: 6 }, // Celo Mainnet
    11142220: { symbol: 'USDC', decimals: 6 }, // Celo Sepolia
  }

  return tokenInfo[chainId] || null
}

/**
 * Alchemy webhook endpoint for Deposit events
 * Receives notifications when PoopVault contracts emit Deposit events
 */
export async function handleAlchemyDepositWebhook(req: Request, res: Response) {
  const timestamp = new Date().toISOString()
  console.log(`🔔 [WEBHOOK:RECEIVED] Incoming request at ${timestamp}`)

  try {
    const payload = req.body as AlchemyWebhookPayload

    // Validate payload structure (GraphQL format)
    if (!payload.event) {
      console.error('❌ [WEBHOOK:ERROR] Missing event in payload')
      return res.status(400).json({ success: false, error: 'Missing event' })
    }

    if (
      !payload.event.data ||
      !payload.event.data.block ||
      !payload.event.data.block.logs
    ) {
      console.error('❌ [WEBHOOK:ERROR] Missing logs in GraphQL payload', {
        hasData: !!payload.event.data,
        hasBlock: !!(payload.event.data && payload.event.data.block),
        hasLogs: !!(
          payload.event.data &&
          payload.event.data.block &&
          payload.event.data.block.logs
        ),
      })
      return res.status(400).json({ success: false, error: 'Missing logs in GraphQL payload' })
    }

    const block = payload.event.data.block
    const logs = block.logs
    const network = payload.event.network

    // Get chain ID from network name
    const chainId = getChainIdFromNetwork(network)
    if (!chainId) {
      console.error('❌ [WEBHOOK:ERROR] Unknown network', { network })
      return res.status(400).json({ success: false, error: `Unknown network: ${network}` })
    }

    // Get token info for this chain
    const tokenInfo = getTokenInfo(chainId)
    if (!tokenInfo) {
      console.error('❌ [WEBHOOK:ERROR] Token info not configured for chain', { chainId })
      return res.status(500).json({ error: 'Token info not configured for this chain' })
    }

    // Get the correct signing key for this chain
    const signingKeyEnvVar = `ALCHEMY_WEBHOOK_SIGNING_KEY_${chainId}`
    const signingKey = process.env[signingKeyEnvVar] || process.env.ALCHEMY_WEBHOOK_SIGNING_KEY

    if (!signingKey) {
      console.error('❌ [WEBHOOK:ERROR] Signing key not configured', {
        chainId,
        envVar: signingKeyEnvVar,
      })
      return res.status(500).json({ error: 'Webhook signing key not configured' })
    }

    // Verify signature for security
    const signature = req.headers['x-alchemy-signature'] as string | undefined
    const rawBody = JSON.stringify(req.body)
    const isValid = verifyAlchemySignature(rawBody, signature, signingKey)

    if (!isValid) {
      console.error('❌ [WEBHOOK:ERROR] Invalid signature', {
        chainId,
        receivedSignature: signature ? signature.substring(0, 20) + '...' : 'none',
        expectedKeyPrefix: signingKey.substring(0, 10) + '...',
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Verify contract address matches our deployed contract
    const expectedContractAddress = POOP_VAULT_ADDRESSES[chainId as keyof typeof POOP_VAULT_ADDRESSES]
    if (!expectedContractAddress) {
      console.error('❌ [WEBHOOK:ERROR] Contract not deployed on this chain', { chainId })
      return res.status(400).json({ error: 'Contract not deployed on this chain' })
    }

    console.log('📥 [WEBHOOK:PROCESSING] Processing webhook', {
      chainId,
      network,
      blockNumber: block.number,
      events: logs.length,
      contractAddress: expectedContractAddress,
    })

    // Process each log (event)
    let processedCount = 0
    for (const log of logs) {
      try {
        const vaultAddress = log.account.address.toLowerCase()
        const expectedAddress = expectedContractAddress.toLowerCase()

        // Verify this log is from our contract
        if (vaultAddress !== expectedAddress) {
          console.warn('⚠️ [WEBHOOK:WARNING] Log from unknown contract, skipping', {
            received: vaultAddress,
            expected: expectedAddress,
          })
          continue
        }

        const txHash = log.transaction.hash
        const blockNumber = block.number

        console.log('🔍 [WEBHOOK:DECODING] Processing Deposit event', {
          chainId,
          txHash,
          blockNumber,
          vaultAddress,
        })

        // Decode the Deposit event
        const iface = new ethers.Interface(DEPOSIT_EVENT_ABI)
        const decodedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        })

        if (!decodedLog) {
          console.error('❌ [WEBHOOK:ERROR] Failed to decode log', { txHash })
          continue
        }

        // Extract event parameters
        const sender = decodedLog.args[0] as string
        const amountWei = decodedLog.args[1] as bigint
        const poopId = decodedLog.args[2] as string

        // Format amount from wei to human-readable
        const amount = ethers.formatUnits(amountWei, tokenInfo.decimals)

        console.log('✅ [WEBHOOK:DECODED] Deposit event decoded', {
          poopId,
          sender,
          amount: `${amount} ${tokenInfo.symbol}`,
          txHash,
          blockNumber,
        })

        // Process the deposit (update DB state from CREATED to FUNDED)
        await processDeposit({
          poopId,
          sender,
          amount,
          tokenSymbol: tokenInfo.symbol,
          txHash,
          blockNumber,
          chainId,
        })

        processedCount++
      } catch (error) {
        console.error('❌ [WEBHOOK:ERROR] Error processing log', {
          error: error instanceof Error ? error.message : 'Unknown error',
          logIndex: log.index,
          txHash: log.transaction.hash,
        })
        // Continue processing other logs even if one fails
      }
    }

    // Always respond with 200 to Alchemy to acknowledge receipt
    return res.json({
      success: true,
      processed: processedCount,
      total: logs.length,
    })
  } catch (error) {
    console.error('❌ [WEBHOOK:ERROR] Webhook handler error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Still return 200 to prevent Alchemy from retrying
    // Log the error for investigation
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Alchemy webhook endpoint for Cancelled events
 * Receives notifications when PoopVault contracts emit Cancelled events
 */
export async function handleAlchemyCancelledWebhook(req: Request, res: Response) {
  const timestamp = new Date().toISOString()
  console.log(`🔔 [WEBHOOK:RECEIVED] Incoming cancellation request at ${timestamp}`)

  try {
    const payload = req.body as AlchemyWebhookPayload

    // Validate payload structure (GraphQL format)
    if (!payload.event) {
      console.error('❌ [WEBHOOK:ERROR] Missing event in payload')
      return res.status(400).json({ success: false, error: 'Missing event' })
    }

    if (
      !payload.event.data ||
      !payload.event.data.block ||
      !payload.event.data.block.logs
    ) {
      console.error('❌ [WEBHOOK:ERROR] Missing logs in GraphQL payload', {
        hasData: !!payload.event.data,
        hasBlock: !!(payload.event.data && payload.event.data.block),
        hasLogs: !!(
          payload.event.data &&
          payload.event.data.block &&
          payload.event.data.block.logs
        ),
      })
      return res.status(400).json({ success: false, error: 'Missing logs in GraphQL payload' })
    }

    const block = payload.event.data.block
    const logs = block.logs
    const network = payload.event.network

    // Get chain ID from network name
    const chainId = getChainIdFromNetwork(network)
    if (!chainId) {
      console.error('❌ [WEBHOOK:ERROR] Unknown network', { network })
      return res.status(400).json({ success: false, error: `Unknown network: ${network}` })
    }

    // Get token info for this chain
    const tokenInfo = getTokenInfo(chainId)
    if (!tokenInfo) {
      console.error('❌ [WEBHOOK:ERROR] Token info not configured for chain', { chainId })
      return res.status(500).json({ error: 'Token info not configured for this chain' })
    }

    // Get the correct signing key for this chain
    const signingKeyEnvVar = `ALCHEMY_WEBHOOK_SIGNING_KEY_${chainId}`
    const signingKey = process.env[signingKeyEnvVar] || process.env.ALCHEMY_WEBHOOK_SIGNING_KEY

    if (!signingKey) {
      console.error('❌ [WEBHOOK:ERROR] Signing key not configured', {
        chainId,
        envVar: signingKeyEnvVar,
      })
      return res.status(500).json({ error: 'Webhook signing key not configured' })
    }

    // Verify signature for security
    const signature = req.headers['x-alchemy-signature'] as string | undefined
    const rawBody = JSON.stringify(req.body)
    const isValid = verifyAlchemySignature(rawBody, signature, signingKey)

    if (!isValid) {
      console.error('❌ [WEBHOOK:ERROR] Invalid signature', {
        chainId,
        receivedSignature: signature ? signature.substring(0, 20) + '...' : 'none',
        expectedKeyPrefix: signingKey.substring(0, 10) + '...',
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Verify contract address matches our deployed contract
    const expectedContractAddress = POOP_VAULT_ADDRESSES[chainId as keyof typeof POOP_VAULT_ADDRESSES]
    if (!expectedContractAddress) {
      console.error('❌ [WEBHOOK:ERROR] Contract not deployed on this chain', { chainId })
      return res.status(400).json({ error: 'Contract not deployed on this chain' })
    }

    console.log('📥 [WEBHOOK:PROCESSING] Processing cancellation webhook', {
      chainId,
      network,
      blockNumber: block.number,
      events: logs.length,
      contractAddress: expectedContractAddress,
    })

    // Process each log (event)
    let processedCount = 0
    for (const log of logs) {
      try {
        const vaultAddress = log.account.address.toLowerCase()
        const expectedAddress = expectedContractAddress.toLowerCase()

        // Verify this log is from our contract
        if (vaultAddress !== expectedAddress) {
          console.warn('⚠️ [WEBHOOK:WARNING] Log from unknown contract, skipping', {
            received: vaultAddress,
            expected: expectedAddress,
          })
          continue
        }

        const txHash = log.transaction.hash
        const blockNumber = block.number

        console.log('🔍 [WEBHOOK:DECODING] Processing Cancelled event', {
          chainId,
          txHash,
          blockNumber,
          vaultAddress,
        })

        // Decode the Cancelled event
        const iface = new ethers.Interface(CANCELLED_EVENT_ABI)
        const decodedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        })

        if (!decodedLog) {
          console.error('❌ [WEBHOOK:ERROR] Failed to decode log', { txHash })
          continue
        }

        // Extract event parameters
        const sender = decodedLog.args[0] as string
        const amountWei = decodedLog.args[1] as bigint
        const poopId = decodedLog.args[2] as string

        // Format amount from wei to human-readable
        const amount = ethers.formatUnits(amountWei, tokenInfo.decimals)

        console.log('✅ [WEBHOOK:DECODED] Cancelled event decoded', {
          poopId,
          sender,
          amount: `${amount} ${tokenInfo.symbol}`,
          txHash,
          blockNumber,
        })

        // Process the cancellation (update DB state to CANCELLED)
        await processCancellation({
          poopId,
          sender,
          amount,
          tokenSymbol: tokenInfo.symbol,
          txHash,
          blockNumber,
          chainId,
        })

        processedCount++
      } catch (error) {
        console.error('❌ [WEBHOOK:ERROR] Error processing log', {
          error: error instanceof Error ? error.message : 'Unknown error',
          logIndex: log.index,
          txHash: log.transaction.hash,
        })
        // Continue processing other logs even if one fails
      }
    }

    // Always respond with 200 to Alchemy to acknowledge receipt
    return res.json({
      success: true,
      processed: processedCount,
      total: logs.length,
    })
  } catch (error) {
    console.error('❌ [WEBHOOK:ERROR] Webhook handler error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Still return 200 to prevent Alchemy from retrying
    // Log the error for investigation
    return res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

