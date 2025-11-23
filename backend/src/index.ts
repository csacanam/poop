/**
 * Backend Server
 *
 * HTTP server for POOP backend services
 */

import 'dotenv/config' // Load environment variables from .env file
import express from 'express'
import cors from 'cors'
import { checkUser, checkUserByEmail, checkUsername, createUser } from './routes/users.js'
import { createPoop, getUserPoops, getRecipientPoops, verifyUserAndAssociatePoop } from './routes/poops.js'
import { claimPoop } from './routes/claim.js'
import { handleAlchemyDepositWebhook, handleAlchemyCancelledWebhook } from './routes/webhooks.js'
import { verifySelfProof } from './routes/self-verify.js'

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
// CORS configuration - allow all origins for now (can be restricted in production)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-alchemy-signature'],
}))
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// User routes
app.get('/api/users/check', async (req, res) => {
  try {
    const { address } = req.query

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address query parameter is required' })
    }

    const result = await checkUser(address)
    res.json(result)
  } catch (error: any) {
    console.error('Error checking user:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.get('/api/users/check-username', async (req, res) => {
  try {
    const { username } = req.query

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username query parameter is required' })
    }

    const result = await checkUsername(username)
    res.json(result)
  } catch (error: any) {
    console.error('Error checking username:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.get('/api/users/check-email', async (req, res) => {
  try {
    const { email } = req.query

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email query parameter is required' })
    }

    const result = await checkUserByEmail(email)
    res.json(result)
  } catch (error: any) {
    console.error('Error checking user by email:', error)
    
    if (error.message.includes('Invalid email')) {
      return res.status(400).json({ error: error.message })
    }
    
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { address, username, email } = req.body

    if (!address || !username) {
      return res.status(400).json({ error: 'Address and username are required' })
    }

    const result = await createUser(address, username, email)
    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    // Check for specific error types
    if (error.message.includes('already taken') || error.message.includes('already registered')) {
      return res.status(409).json({ error: error.message })
    }
    
    if (error.message.includes('must be') || error.message.includes('required') || error.message.includes('Invalid email')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// Poop routes
app.post('/api/poops', async (req, res) => {
  try {
    const { senderAddress, recipientEmail, amount } = req.body

    if (!senderAddress || !recipientEmail || !amount) {
      return res.status(400).json({ error: 'Sender address, recipient email, and amount are required' })
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' })
    }

    const result = await createPoop(senderAddress, recipientEmail, numericAmount)
    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error creating POOP:', error)

    // Check for specific error types
    if (error.message.includes('not found') || error.message.includes('complete your profile')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.message.includes('Invalid') || error.message.includes('must be') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.get('/api/poops', async (req, res) => {
  try {
    const { address, username } = req.query

    if (!address && !username) {
      return res.status(400).json({ error: 'Either address or username query parameter is required' })
    }

    const senderAddress = typeof address === 'string' ? address : undefined
    const senderUsername = typeof username === 'string' ? username : undefined

    const result = await getUserPoops(senderAddress, senderUsername)
    res.json(result)
  } catch (error: any) {
    console.error('Error fetching user POOPs:', error)

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.post('/api/poops/verify', async (req, res) => {
  try {
    const { userId, poopId } = req.body

    if (!userId || !poopId) {
      return res.status(400).json({ error: 'userId and poopId are required' })
    }

    const result = await verifyUserAndAssociatePoop(userId, poopId)
    res.json(result)
  } catch (error: any) {
    console.error('Error verifying user and associating POOP:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

app.get('/api/poops/recipient', async (req, res) => {
  try {
    const { email } = req.query

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email query parameter is required' })
    }

    const result = await getRecipientPoops(email)
    res.json(result)
  } catch (error: any) {
    console.error('Error fetching recipient POOPs:', error)

    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message })
    }

    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// Self verification endpoint (called by Self's relayers)
app.post('/api/self/verify', async (req, res) => {
  try {
    const { attestationId, proof, publicSignals, userContextData } = req.body

    if (!proof || !publicSignals || !attestationId || !userContextData) {
      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Proof, publicSignals, attestationId and userContextData are required',
      })
    }

    const result = await verifySelfProof(attestationId, proof, publicSignals, userContextData)

    return res.status(200).json({
      status: 'success',
      result: true,
      userId: result.userId,
    })
  } catch (error: any) {
    console.error('Error verifying Self proof:', error)
    
    let reason = 'Verification failed'
    if (error.message.includes('Minimum age')) {
      reason = 'Minimum age verification failed'
    } else if (error.message) {
      reason = error.message
    }

    return res.status(200).json({
      status: 'error',
      result: false,
      reason,
    })
  }
})

// Webhook routes
app.post('/api/webhooks/alchemy/deposit', handleAlchemyDepositWebhook)
app.post('/api/webhooks/alchemy/cancelled', handleAlchemyCancelledWebhook)

// Webhook test endpoint (to verify routes are accessible)
app.get('/api/webhooks/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoints are accessible',
    endpoints: {
      deposit: '/api/webhooks/alchemy/deposit',
      cancelled: '/api/webhooks/alchemy/cancelled',
    },
    signingKeys: {
      deposit: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY_DEPOSIT ? '✅ SET' : '❌ NOT SET',
      cancelled: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY_CANCELLED ? '✅ SET' : '❌ NOT SET',
    },
    contractAddress: {
      celoMainnet: '0xA8d036fd3355C9134b5A6Ba837828FAa47fC8CCf',
    },
    eventTopics: {
      deposit: '0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b',
      cancelled: '0x227769bab1f1964756253845348433adc8394207b1a7e9d88f32e96ae50bf225',
    },
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 POOP Backend Server running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
  
  // Log webhook signing key status (without exposing the actual keys)
  console.log(`🔑 [SERVER:STARTUP] Webhook signing keys status:`, {
    deposit: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY_DEPOSIT ? '✅ SET' : '❌ NOT SET',
    cancelled: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY_CANCELLED ? '✅ SET' : '❌ NOT SET',
    general: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY ? '✅ SET (fallback)' : '❌ NOT SET',
  })
})
