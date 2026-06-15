export type OrderType = 'vip' | 'normal'

export interface Order {
  id: string
  type: OrderType
}

export interface Robot {
  id: number
  processingOrder: Order | null
  /** Timestamp (ms) when the robot started processing its current order */
  processingStartTime: number | null
}

/** Format a number as zero-padded 3-digit ID (for both orders and robots) */
export function padId(num: number): string {
  return String(num).padStart(3, '0')
}
