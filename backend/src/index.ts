/**
 * Backend Server
 *
 * HTTP server for POOP backend services
 */

import 'dotenv/config' // Load environment variables from .env file
import express from 'express'
import cors from 'cors'
import { checkUser, checkUsername, createUser } from './routes/users.js'
import { createPoop } from './routes/poops.js'

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(cors())
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 POOP Backend Server running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
})
