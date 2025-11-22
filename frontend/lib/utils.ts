import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obscure the middle part of an email address
 * Always shows first 3 characters + 3 asterisks + @domain for consistent sizing
 * Example: "user@example.com" -> "use***@example.com"
 * Example: "john.doe@example.com" -> "joh***@example.com"
 * Example: "ab@example.com" -> "ab****@example.com" (pads if less than 3 chars)
 */
export function obscureEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email
  }

  const [localPart, domain] = email.split('@')
  
  // Always show first 3 characters (pad if necessary) + 3 asterisks
  const visiblePart = localPart.slice(0, 3).padEnd(3, '*')
  const obscuredPart = '***'
  
  return `${visiblePart}${obscuredPart}@${domain}`
}
