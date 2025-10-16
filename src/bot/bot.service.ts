import { Order } from "../entities/order.type";
import { CompletedOrder } from "../entities/completed-order.type";

export type BotCallbacks = {
  onCompleted: (completed: CompletedOrder) => void;
  onStopped: (orderReturned?: Order) => void;
};

export class BotService {
  readonly id: number;
  private processingTimer: NodeJS.Timeout | null = null;
  private currentOrder: Order | null = null;
  private readonly callbacks: BotCallbacks;
  private readonly processingMs: number;

  constructor(
    id: number,
    callbacks: BotCallbacks,
    processingMs: number = 10_000
  ) {
    this.id = id;
    this.callbacks = callbacks;
    this.processingMs = processingMs;
  }

  isBusy(): boolean {
    return this.currentOrder !== null;
  }

  getCurrentOrder(): Order | null {
    return this.currentOrder;
  }

  tryStart(order: Order | undefined): boolean {
    if (!order || this.isBusy()) return false;
    this.currentOrder = order;
    const startedAt = new Date();
    this.processingTimer = setTimeout(() => {
      const completedAt = new Date();
      const finished: CompletedOrder = {
        ...order,
        startedAt,
        completedAt,
        botId: this.id,
      };
      this.currentOrder = null;
      this.processingTimer = null;
      this.callbacks.onCompleted(finished);
    }, this.processingMs);
    return true;
  }

  stop(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    const orderToReturn = this.currentOrder ?? undefined;
    this.currentOrder = null;
    this.callbacks.onStopped(orderToReturn);
  }
}
