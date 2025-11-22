/**
 * Utility functions
 */

/**
 * Obscure the middle part of an email address
 * Example: "user@example.com" -> "us***@example.com"
 * Example: "john.doe@example.com" -> "jo***@example.com"
 */
export function obscureEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email
  }

  const [localPart, domain] = email.split('@')
  
  if (localPart.length <= 2) {
    // If local part is 2 chars or less, just show it
    return `${localPart}@${domain}`
  }

  // Show first 2 characters, obscure the rest
  const visiblePart = localPart.slice(0, 2)
  const obscuredPart = '*'.repeat(Math.min(localPart.length - 2, 3)) // Max 3 asterisks
  
  return `${visiblePart}${obscuredPart}@${domain}`
}
