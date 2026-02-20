import { Bot } from "../models/bot";
import { Order } from "../models/order";
import { BotManager } from "./bot-manager";
import { OrderQueue } from "./order-queue";
import { log } from "../utils/logger";
import { LogType, OrderType } from "../types";

const { ORDER_CREATE } = LogType;

export class OrderController {
  private orderQueue: OrderQueue;
  private botManager: BotManager;
  private lastOrderId: number = 1001;

  constructor() {
    this.orderQueue = new OrderQueue();
    this.botManager = new BotManager(this.orderQueue);
  }

  addOrder(type: OrderType): Order {
    const nextOrderId = this.lastOrderId++;
    const newOrder = new Order(nextOrderId, type);

    this.orderQueue.add(newOrder);

    log(ORDER_CREATE, {
      order_id: newOrder.id,
      order_type: newOrder.type,
      order_status: newOrder.status,
    });

    this.botManager.assignAndProcessOrder();

    return newOrder;
  }

  addBot(): Bot {
    return this.botManager.addBot();
  }

  removeBot(): Bot | null {
    return this.botManager.removeBot();
  }

  getStats() {
    return {
      totalOrders: Order.totalCount,
      countByType: Order.countByType,
      completedCount: Order.completedCount,
      activeBots: BotManager.activeBotCount,
      destroyedBots: BotManager.removeBotCount,
      pendingOrders: this.orderQueue.pendingCount,
    };
  }
}
