import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

/**
 * Format milliseconds into human-readable duration
 * Examples: 5s, 1m 30s, 2h 45m
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  if (minutes > 0) {
    const secs = seconds % 60
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  return `${seconds}s`
}

/**
 * Get time since timestamp in human-readable format
 */
export function getTimeSince(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp as number)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return formatDuration(Math.max(0, diff))
}
