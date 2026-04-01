import { BotManagerService } from '../manager/bot-manager.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { Order } from '../order/order.model.js';
import { Bot } from '../bot/bot.model.js';

export class DemoService {
  constructor(
    private manager: BotManagerService,
    private logger: LoggerService,
  ) {}

  async run(): Promise<void> {
    console.clear();
    this.logger.log("=== McDonald's Bot Manager Demo ===\n");

    this.logger.log('>> Adding 2 Normal Orders');
    this.manager.addNormalOrder();
    this.manager.addNormalOrder();
    this.printStatus();

    this.logger.log('>> Adding 1 VIP Order');
    this.manager.addVipOrder();
    this.printStatus();

    this.logger.log('>> Adding Bot 1');
    this.manager.addBot();
    this.printStatus();

    this.logger.log('>> Adding 1 Normal Order');
    this.manager.addNormalOrder();
    this.printStatus();

    this.logger.log('>> Waiting 10 seconds for order to complete...');
    await this.sleep(10_000);
    this.printStatus();

    this.logger.log('>> Adding Bot 2');
    this.manager.addBot();
    this.printStatus();

    this.logger.log('>> Waiting 5 seconds...');
    await this.sleep(5_000);
    this.logger.log('>> Removing newest bot');
    this.manager.removeBot();
    this.printStatus();

    this.logger.log('>> Waiting for remaining orders to complete...');
    await this.sleep(30_000);
    this.printStatus();

    this.logger.log('=== Demo Complete ===');
  }

  private printStatus(): void {
    this.logger.log(`PENDING: ${this.formatOrders(this.manager.getPendingOrders())}`);
    this.logger.log(`COMPLETE: ${this.formatOrders(this.manager.getCompletedOrders())}`);
    this.logger.log(`BOTS: ${this.formatBots(this.manager.getBots())}`);
    this.logger.log('---', false);
  }

  private formatOrders(orders: Order[]): string {
    if (orders.length === 0) return '[]';
    return '[' + orders.map((o) => `#${o.id}(${o.type.toUpperCase()})`).join(', ') + ']';
  }

  private formatBots(bots: Bot[]): string {
    if (bots.length === 0) return '[]';
    return '[' + bots.map((b) => `Bot#${b.id}(${b.status}${b.currentOrder ? `:Order#${b.currentOrder.id}` : ''})`).join(', ') + ']';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
