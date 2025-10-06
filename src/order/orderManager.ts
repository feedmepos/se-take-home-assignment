import { Order, OrderType } from "../lib/model";
import { OrderQueue } from "../lib/queue/orderQueue";
import logger from "../lib/util/logger";
import { BotManager } from "./botManager";
import { OrderManagerStatus } from "./type";

export class OrderManager {
  queue: OrderQueue;
  botManager: BotManager;
  id: number;
  status: OrderManagerStatus;
  // Order statistics
  vipOrders: number;
  normalOrders: number;
  completedOrders: number;
  pendingOrders: number;

  constructor() {
    this.queue = new OrderQueue();
    this.botManager = new BotManager(this.queue, this.orderComplete.bind(this));
    this.status = OrderManagerStatus.START;
    this.id = 0;
    this.vipOrders = 0;
    this.normalOrders = 0;
    this.completedOrders = 0;
    this.pendingOrders = 0;
  }

  private incrementId() {
    this.id += 1;
    this.pendingOrders += 1;
  }

  addOrder() {
    if (this.status === OrderManagerStatus.STOP) {
      return;
    }
    const order = new Order(this.id, OrderType.NORMAL);
    this.queue.enqueue(order);
    this.incrementId();
    this.normalOrders += 1;
  }

  addVipOrder() {
    if (this.status === OrderManagerStatus.STOP) {
      return;
    }
    const order = new Order(this.id, OrderType.VIP);
    this.queue.enqueue(order);
    this.incrementId();
    this.vipOrders += 1;
  }

  addBot() {
    this.botManager.addBot();
  }

  removeBot() {
    this.botManager.removeBot();
  }

  gracefulShutdown() {
    this.status = OrderManagerStatus.STOP;
  }

  printStatistics() {
    logger.info(`Final status:
- Total orders Processed: ${this.vipOrders + this.normalOrders} (${
      this.vipOrders
    } VIP, ${this.normalOrders} Normal)
- Orders Completed: ${this.completedOrders}
- Active Bots: ${this.botManager.activeCount()}
- Pending Orders: ${this.pendingOrders}\n\n`);
  }

  private orderComplete() {
    this.pendingOrders -= 1;
    this.completedOrders += 1;
    // Wait for all
    if (this.status === OrderManagerStatus.STOP && this.pendingOrders === 0) {
      this.printStatistics();
    }
  }
}
