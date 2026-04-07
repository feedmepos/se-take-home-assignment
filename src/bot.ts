import { ORDER_STATUS, Order } from './order.js';

export const BOT_STATUS = Object.freeze({ IDLE: 'IDLE', ACTIVE: 'ACTIVE' } as const);
export type BotStatus = (typeof BOT_STATUS)[keyof typeof BOT_STATUS];

export const PROCESSING_TIME_MS = 10_000;
export const VVIP_PROCESSING_TIME_MS = 7_000;

export type OnOrderComplete = (bot: Bot, order: Order) => void;

export class Bot {
  readonly id: number;
  status: BotStatus;
  currentOrder: Order | null;
  private readonly _onOrderComplete: OnOrderComplete;
  private _timer: ReturnType<typeof setTimeout> | null;
  private _pickedUpAt: number | null;
  private _processingDelay: number | null;

  constructor(id: number, onOrderComplete: OnOrderComplete) {
    this.id = id;
    this.status = BOT_STATUS.IDLE;
    this.currentOrder = null;
    this._onOrderComplete = onOrderComplete;
    this._timer = null;
    this._pickedUpAt = null;
    this._processingDelay = null;
  }

  /** Pick up an order and start processing it. */
  pickupOrder(order: Order): void {
    order.status = ORDER_STATUS.PROCESSING;
    this.currentOrder = order;
    this.status = BOT_STATUS.ACTIVE;

    const delay = order.isVVIP ? VVIP_PROCESSING_TIME_MS : PROCESSING_TIME_MS;
    this._pickedUpAt = Date.now();
    this._processingDelay = delay;
    this._timer = setTimeout(() => {
      this._completeOrder();
    }, delay);
  }

  /** Returns milliseconds remaining until this bot's current order completes, or null if idle. */
  getRemainingMs(): number | null {
    if (this._pickedUpAt === null || this._processingDelay === null) return null;
    return Math.max(0, this._processingDelay - (Date.now() - this._pickedUpAt));
  }

  /**
   * Cancel current processing (bot is being removed).
   * Returns the order that was in progress (or null if idle).
   */
  cancel(): Order | null {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    const order = this.currentOrder;
    if (order) {
      order.status = ORDER_STATUS.PENDING;
      this.currentOrder = null;
    }
    this.status = BOT_STATUS.IDLE;
    this._pickedUpAt = null;
    this._processingDelay = null;
    return order;
  }

  private _completeOrder(): void {
    const order = this.currentOrder!;
    order.status = ORDER_STATUS.COMPLETE;
    this.currentOrder = null;
    this.status = BOT_STATUS.IDLE;
    this._timer = null;
    this._pickedUpAt = null;
    this._processingDelay = null;
    this._onOrderComplete(this, order);
  }
}
