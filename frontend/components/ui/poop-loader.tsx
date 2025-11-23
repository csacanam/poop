"use client"

import { cn } from "@/lib/utils"

interface PoopLoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
}

export function PoopLoader({ className, size = "md" }: PoopLoaderProps) {
  const containerSize = size === "sm" ? "h-20" : size === "md" ? "h-24" : "h-32"
  
  return (
    <div className={cn("relative flex items-center justify-center", containerSize, className)}>
      {/* Toilet bowl representation */}
      <div className="absolute bottom-0 w-20 h-10 bg-muted/50 rounded-b-full border-2 border-border/50"></div>
      
      {/* Falling poop */}
      <div className="relative w-full h-full flex items-start justify-center">
        <span
          className={cn(
            "block animate-falling-poop",
            sizeClasses[size]
          )}
          role="status"
          aria-label="Loading"
        >
          💩
        </span>
      </div>
      
      {/* Splash effect */}
      <div className="absolute bottom-2 w-14 h-3 bg-primary/30 rounded-full animate-splash blur-sm"></div>
    </div>
  )
}

// Also export as default for compatibility
export default PoopLoader

