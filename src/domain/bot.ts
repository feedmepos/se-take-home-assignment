/**
 * @layer Domain
 * @role Cooking bot: process orders, 10s timer, completion callback; cancelWork clears timer on bot removal
 * @depends constants.ts, types.ts
 * @exports Bot class (startWork, cancelWork, release, toSnapshot, etc.)
 * @must-not Depend on Vue/DOM; must not own queue order or dispatch logic (OrderController owns that)
 */
import { BOT_STATUS, PROCESSING_SECONDS } from './constants'
import type { BotSnapshot, BotStatus } from './types'

export class Bot {
  readonly id: number
  private _status: BotStatus = BOT_STATUS.IDLE
  private _currentOrderId?: number
  private _startedAt?: number
  private _timer?: ReturnType<typeof setTimeout>
  private _onComplete?: () => void

  constructor(id: number) {
    this.id = id
  }

  get status(): BotStatus {
    return this._status
  }

  get currentOrderId(): number | undefined {
    return this._currentOrderId
  }

  isIdle(): boolean {
    return this._status === BOT_STATUS.IDLE
  }

  isProcessing(): boolean {
    return this._status === BOT_STATUS.PROCESSING
  }

  /** Start processing an order; fires onComplete when the timer elapses. */
  startWork(orderId: number, onComplete: () => void): void {
    this.cancelWork()
    this._status = BOT_STATUS.PROCESSING
    this._currentOrderId = orderId
    this._startedAt = Date.now()
    this._onComplete = onComplete

    this._timer = setTimeout(() => {
      this._timer = undefined
      const callback = this._onComplete
      this._onComplete = undefined
      callback?.()
    }, PROCESSING_SECONDS * 1000)
  }

  /** Stop timer and reset to idle without firing onComplete. */
  cancelWork(): void {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = undefined
    }
    this._onComplete = undefined
    this._startedAt = undefined
    this._status = BOT_STATUS.IDLE
    this._currentOrderId = undefined
  }

  release(): void {
    this._status = BOT_STATUS.IDLE
    this._currentOrderId = undefined
    this._startedAt = undefined
  }

  getStartedAt(): number | undefined {
    return this._startedAt
  }

  toSnapshot(): BotSnapshot {
    return {
      id: this.id,
      status: this._status,
      currentOrderId: this._currentOrderId,
    }
  }
}
