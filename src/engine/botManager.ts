import { Clock } from "./clock";
import type { Order, Bot, EngineEvent } from "./types";
import { OrderQueue } from "./orderQueue";

export class BotManager {
  private bots: Bot[] = [];
  private completed: Order[] = [];
  private nextBotId = 1;

  constructor(
    private queue: OrderQueue,
    private clock: Clock,
    private onEvent: (event: EngineEvent) => void,
    private processMs: number = 10_000
  ) {}

  getBotsCount(): number {
    return this.bots.length;
  }

  getCompletedIds(): number[] {
    return this.completed.map((o) => o.id);
  }

  addBot(): void {
    const bot: Bot = { id: this.nextBotId++, state: "IDLE" };
    this.bots.push(bot);

    this.onEvent({
      type: "BOT_ADDED",
      botId: bot.id,
      botsCount: this.getBotsCount(),
    });

    this.kick(bot); // Attempt to process pending orders immediately.
  }

  removeNewestBot(): void {
    const bot = this.bots.pop();
    if (!bot) return;

    // If an order is being processed: Stop and return the order to pending.
    if (bot.state === "WORKING" && bot.currentOrder && bot.cancelToken) {
      bot.cancelToken.cancelled = true;

      const order = bot.currentOrder;
      order.status = "PENDING";
      this.queue.enqueue(order);

      this.onEvent({
        type: "BOT_CANCELLED",
        botId: bot.id,
        orderId: order.id,
        botsCount: this.getBotsCount(),
      });
    } else {
      this.onEvent({
        type: "BOT_REMOVED",
        botId: bot.id,
        botsCount: this.getBotsCount(),
      });
    }

    bot.state = "STOPPED";
  }

  notifyNewOrder(): void {
    // Kick all idle bots when there are new orders.
    for (const bot of this.bots) {
      if (bot.state === "IDLE") this.kick(bot);
    }
  }

  private kick(bot: Bot): void {
    if (bot.state !== "IDLE") return;

    const order = this.queue.dequeue();
    if (!order) return;

    bot.state = "WORKING";
    bot.currentOrder = order;
    bot.cancelToken = { cancelled: false };

    order.status = "PROCESSING";

    this.onEvent({
      type: "ORDER_PICKED",
      botId: bot.id,
      orderId: order.id,
      privilege: order.privilege,
    });

    // Asynchronous processing
    void this.process(bot, order, bot.cancelToken);
  }

  private async process(
    bot: Bot,
    order: Order,
    token: { cancelled: boolean }
  ): Promise<void> {
    await this.clock.sleep(this.processMs);

    if (token.cancelled) {
      // The process was interrupted by removeNewestBot, so no completion action will be performed here.
      bot.state = "IDLE";
      bot.currentOrder = undefined;
      bot.cancelToken = undefined;
      return;
    }

    order.status = "COMPLETE";
    this.completed.push(order);

    this.onEvent({
      type: "ORDER_COMPLETED",
      botId: bot.id,
      orderId: order.id,
      privilege: order.privilege,
      processingMs: this.processMs,
    });

    bot.state = "IDLE";
    bot.currentOrder = undefined;
    bot.cancelToken = undefined;

    // Continue processing the next order if available.
    this.kick(bot);

    // If still idle after trying to kick, emit idle event
    if (bot.state === "IDLE") {
      this.onEvent({ type: "BOT_IDLE", botId: bot.id });
    }
  }
}
