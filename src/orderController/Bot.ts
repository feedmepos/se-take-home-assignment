import { Order, OrderStatus } from "./Order";
import { write } from "./resultWriter";

export enum BotStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
}

export class Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  private timer: ReturnType<typeof setTimeout> | null;

  constructor(id: number) {
    this.id = id;
    this.status = BotStatus.IDLE;
    this.currentOrder = null;
    this.timer = null;
  }

  pickupOrder(order: Order, onComplete: (bot: Bot, order: Order) => void): void {
    this.currentOrder = order;
    this.status = BotStatus.PROCESSING;
    write(`Bot #${this.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);

    this.timer = setTimeout(() => {
      order.status = OrderStatus.COMPLETE;
      write(`Bot #${this.id} completed ${order.type} Order #${order.id} - Status: COMPLETE`);
      this.currentOrder = null;
      this.status = BotStatus.IDLE;
      this.timer = null;
      onComplete(this, order);
    }, 10_000);
  }

  stop(): Order | null {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const order = this.currentOrder;
    if (order) {
      order.status = OrderStatus.PENDING;
      write(`Bot #${this.id} stopped - ${order.type} Order #${order.id} returned to PENDING`);
    } else {
      write(`Bot #${this.id} destroyed while IDLE`);
    }
    this.currentOrder = null;
    this.status = BotStatus.IDLE;
    return order;
  }
}
