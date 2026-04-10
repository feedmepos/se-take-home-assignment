import { Order } from './types';

export class Bot {
  readonly id: number;
  private currentOrder: Order | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly processingTimeMs: number;
  private readonly onComplete: (bot: Bot, order: Order) => void;

  constructor(id: number, processingTimeMs: number, onComplete: (bot: Bot, order: Order) => void) {
    this.id = id;
    this.processingTimeMs = processingTimeMs;
    this.onComplete = onComplete;
  }

  get isIdle(): boolean {
    return this.currentOrder === null;
  }

  get processingOrder(): Order | null {
    return this.currentOrder;
  }

  startProcessing(order: Order): void {
    order.status = 'PROCESSING';
    this.currentOrder = order;

    this.timer = setTimeout(() => {
      order.status = 'COMPLETE';
      this.currentOrder = null;
      this.timer = null;
      this.onComplete(this, order);
    }, this.processingTimeMs);
  }

  // Stop processing and return the in-progress order (or null if idle)
  stop(): Order | null {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const order = this.currentOrder;
    this.currentOrder = null;
    return order;
  }
}
