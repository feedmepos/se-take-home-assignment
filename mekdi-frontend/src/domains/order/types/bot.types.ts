export enum BotStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY'
}

export interface Bot {
  id: number
  status: BotStatus
  currentOrderId: number | null
  processingTimeoutId: ReturnType<typeof setTimeout> | null
}
