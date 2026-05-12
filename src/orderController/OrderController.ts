import { Order, OrderType, OrderStatus } from "./Order";
import { Bot, BotStatus } from "./Bot";
import { write } from "./resultWriter";

export class OrderController {
  private vipQueue: Order[];
  private normalQueue: Order[];
  private bots: Bot[];
  private orderCounter: number;
  private botCounter: number;

  constructor() {
    this.vipQueue = [];
    this.normalQueue = [];
    this.bots = [];
    this.orderCounter = 1;
    this.botCounter = 1;
  }

  newOrder(type: OrderType): Order {
    const order: Order = {
      id: this.orderCounter++,
      type,
      status: OrderStatus.PENDING,
    };

    if (type === OrderType.VIP) {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }

    write(`New ${type} Order #${order.id} - Status: PENDING`);
    this.dispatchToIdleBot();
    return order;
  }

  addBot(): Bot {
    const bot = new Bot(this.botCounter++);
    this.bots.push(bot);
    write(`Bot #${bot.id} created - Status: ACTIVE`);
    this.tryDispatch(bot);
    return bot;
  }

  removeBot(): void {
    if (this.bots.length === 0) return;

    const bot = this.bots.pop()!;
    const returnedOrder = bot.stop();

    if (returnedOrder) {
      // Return to front of the appropriate queue
      if (returnedOrder.type === OrderType.VIP) {
        this.vipQueue.unshift(returnedOrder);
      } else {
        this.normalQueue.unshift(returnedOrder);
      }
    }

    write(`Bot #${bot.id} removed - Status: DESTROYED`);
  }

  private nextOrder(): Order | null {
    if (this.vipQueue.length > 0) return this.vipQueue.shift()!;
    if (this.normalQueue.length > 0) return this.normalQueue.shift()!;
    return null;
  }

  private tryDispatch(bot: Bot): void {
    if (bot.status !== BotStatus.IDLE) return;
    const order = this.nextOrder();
    if (!order) {
      write(`Bot #${bot.id} is IDLE - No pending orders`);
      return;
    }
    bot.pickupOrder(order, (finishedBot) => this.tryDispatch(finishedBot));
  }

  private dispatchToIdleBot(): void {
    const idleBot = this.bots.find((b) => b.status === BotStatus.IDLE);
    if (idleBot) this.tryDispatch(idleBot);
  }

  // Getters for testing
  getVipQueue(): Order[] { return this.vipQueue; }
  getNormalQueue(): Order[] { return this.normalQueue; }
  getBots(): Bot[] { return this.bots; }
}
