import Bot from "@/models/bot";
import Order from "@/models/order";
import { PriorityQueue } from "@datastructures-js/priority-queue";
import BotAllocationService from "./bot-allocation";

export default class OrderDispatchService {
  private queue: PriorityQueue<Order>;
  private botAllocationService: BotAllocationService;

  constructor(botAllocationService: BotAllocationService) {
    this.queue = new PriorityQueue(this.comparePriority);
    this.botAllocationService = botAllocationService;
    this.start();
  }

  public start(): void {
    setInterval(this.process.bind(this), 1000);
  }

  public process(): void {
    const bots = this.botAllocationService.getIdleBots();
    bots.forEach((bot) => this.dispatch(bot));
  }

  public reset(): void {
    this.queue.clear();
  }

  private dispatch(bot: Bot) {
    const order = this.queue.dequeue();
    if (!order) return;
    bot.process(order, { onFailure: () => this.enqueue(order) });
  }

  public enqueue(order: Order): void {
    this.queue.enqueue(order);
  }

  private comparePriority(a: Order, b: Order): number {
    if (a.isPriority === b.isPriority) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.isPriority ? -1 : 1;
  }
}
