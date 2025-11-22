/**
 * Backend Entry Point
 * 
 * Simple test script to verify services are working
 */

import { checkUser, checkUsername, createUser } from './routes/users.js'

async function testServices() {
  console.log('🧪 Testing POOP Backend Services...\n')

  // Test address (replace with a real one for testing)
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const testUsername = 'testuser123'

  try {
    // Test 1: Check user by address
    console.log('1️⃣ Testing checkUser...')
    const userCheck = await checkUser(testAddress)
    console.log('✅ checkUser result:', userCheck)
    console.log('')

    // Test 2: Check username availability
    console.log('2️⃣ Testing checkUsername...')
    const usernameCheck = await checkUsername(testUsername)
    console.log('✅ checkUsername result:', usernameCheck)
    console.log('')

    // Test 3: Create user (only if user doesn't exist and username is available)
    if (!userCheck.exists && usernameCheck.available) {
      console.log('3️⃣ Testing createUser...')
      const newUser = await createUser(testAddress, testUsername)
      console.log('✅ createUser result:', newUser)
    } else {
      console.log('3️⃣ Skipping createUser (user exists or username taken)')
    }

    console.log('\n✨ All tests completed!')
  } catch (error) {
    console.error('❌ Error testing services:', error)
    process.exit(1)
  }
}

// Run tests
testServices()

