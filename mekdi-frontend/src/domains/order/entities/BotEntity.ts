import { Bot, BotStatus } from '../types'

export class BotEntity implements Bot {
  id: number
  status: BotStatus
  currentOrderId: number | null
  processingTimeoutId: ReturnType<typeof setTimeout> | null

  constructor(id: number) {
    this.id = id
    this.status = BotStatus.IDLE
    this.currentOrderId = null
    this.processingTimeoutId = null
  }

  isIdle(): boolean {
    return this.status === BotStatus.IDLE
  }

  isBusy(): boolean {
    return this.status === BotStatus.BUSY
  }

  startProcessing(orderId: number, timeoutId: ReturnType<typeof setTimeout>): void {
    this.status = BotStatus.BUSY
    this.currentOrderId = orderId
    this.processingTimeoutId = timeoutId
  }

  stopProcessing(): number | null {
    const orderId = this.currentOrderId
    
    if (this.processingTimeoutId) {
      clearTimeout(this.processingTimeoutId)
    }
    
    this.status = BotStatus.IDLE
    this.currentOrderId = null
    this.processingTimeoutId = null
    
    return orderId
  }

  completeProcessing(): void {
    this.status = BotStatus.IDLE
    this.currentOrderId = null
    this.processingTimeoutId = null
  }

  clone(): BotEntity {
    const cloned = new BotEntity(this.id)
    cloned.status = this.status
    cloned.currentOrderId = this.currentOrderId
    cloned.processingTimeoutId = this.processingTimeoutId
    return cloned
  }
}
