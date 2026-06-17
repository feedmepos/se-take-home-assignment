import { OrderQueue } from "@/lib/order-queue";
import { Order, OrderStatus, Bot } from "@/lib/types";

export class BotWorker {
  private bots: Bot[] = [];
  private queue: OrderQueue;
  private completed: Order[] = [];
  readonly instanceId = Math.random()
      .toString(36)
      .slice(2);
  private running = false;

  constructor(queue: OrderQueue) {
    this.queue = queue;
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private activeJobs = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();

  private processOrder(bot: Bot, order: any) {
    bot.busy = true;
    bot.currentOrder = order;

    order.status = OrderStatus.PROCESSING;

    const timer = setTimeout(() => {
      order.status = OrderStatus.COMPLETE;

      this.completed.push(order);

      bot.busy = false;
      bot.currentOrder = undefined;

      this.activeJobs.delete(bot.id);
    }, 10000);

    this.activeJobs.set(bot.id, timer);

  }

  private loop = async () => {
    while (this.running) {
      const availableBot = this.bots.find(b => !b.busy);
      if (!availableBot) {
        await this.sleep(200);
        continue;
      }

      const order = this.queue.dequeue();
      if (!order) {
        await this.sleep(200);
        continue;
      }

      this.processOrder(availableBot, order);
    }
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  addBot() {
    const bot: Bot = {
      id: this.bots.length + 1,
      busy: false,
    };

    this.bots.push(bot);

    return this.toBotDTO(bot);
  }

  removeBot() {
    const bot = this.bots.pop();

    if (!bot) return;

    const timer = this.activeJobs.get(bot.id);

    if (timer) {
      clearTimeout(timer);
      this.activeJobs.delete(bot.id);
    }

    // If processing → requeue order safely
    if (bot.currentOrder) {
      const order = bot.currentOrder;
      order.status = OrderStatus.PENDING;
      this.queue.requeue(order);
    }
  }

  clearBots() {
    this.activeJobs.forEach(timer => clearTimeout(timer));
    this.activeJobs.clear();
    this.bots = [];
  }

  clearCompletedOrders() {
    this.completed = [];
  }

  private toBotDTO(bot: Bot) {
    return {
      id: bot.id,
      busy: bot.busy,
      currentOrder: bot.currentOrder,
    };
  }

  getState() {
    return {
      instanceId: this.instanceId,
      pending: this.queue.getPending(),
      completed: this.completed,
      bots: this.bots.map(b => this.toBotDTO(b)),
    };
  }
}