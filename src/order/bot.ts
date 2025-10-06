import { Order, OrderStatus } from "../lib/model";
import { OrderQueue } from "../lib/queue/orderQueue";
import logger from "../lib/util/logger";
import { BotEventHandler, BotStatus } from "./type";

export class Bot {
  public id: number;
  private orderQueue: OrderQueue;
  private timer: NodeJS.Timeout | null = null;
  public currentOrder: Order | null = null;
  public state: BotStatus = BotStatus.IDLE;
  public processTime: number;
  private onComplete: BotEventHandler;

  constructor(
    id: number,
    orderQueue: OrderQueue,
    processTime: number,
    onComplete: BotEventHandler
  ) {
    this.id = id;
    this.orderQueue = orderQueue;
    this.processTime = processTime;
    this.onComplete = onComplete;
  }

  startProcessing() {
    // Stop if we are processing an order or bot is stopped (and awaiting for removal)
    if (this.currentOrder || this.state === BotStatus.STOPPED) {
      return;
    }
    // Get the next task from the order queue
    const next = this.orderQueue.dequeue();
    if (!next) {
      // Stop as there are no orders
      this.state = BotStatus.IDLE;
      return;
    }
    // Update order status
    this.currentOrder = next;
    this.currentOrder.status = OrderStatus.PROCESSING;
    // Update bot status
    this.state = BotStatus.BUSY;
    logger.info(
      `Bot#${this.id} picked Order#${this.currentOrder.id} (${this.currentOrder.type})`
    );
    // Simulate processing time
    this.timer = setTimeout(() => {
      if (!this.currentOrder) return;
      // Update order status
      this.currentOrder.status = OrderStatus.COMPLETE;
      logger.info(`Bot#${this.id} completed Order#${this.currentOrder.id}`);
      this.onComplete(this.currentOrder, this.id);
      // Reset state of bot
      this.currentOrder = null;
      this.timer = null;
      this.state = BotStatus.IDLE;
      // Try pick next immediately
      this.startProcessing();
    }, this.processTime);
  }

  stopAndReturnOrder(): Order | null {
    if (this.timer) {
      // Reset timer if there are any pending tasks
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.currentOrder) {
      // Update order status
      const order = this.currentOrder;
      order.status = OrderStatus.PENDING;
      // Update bot status
      this.currentOrder = null;
      this.state = BotStatus.STOPPED;
      logger.info(
        `Bot#${this.id} stopped while processing Order#${order.id}; returning to PENDING`
      );
      return order;
    }
    this.state = BotStatus.STOPPED;
    return null;
  }
}
