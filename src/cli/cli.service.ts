import { BotManagerService } from '../manager/bot-manager.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { Order } from '../order/order.model.js';
import { Bot } from '../bot/bot.model.js';

export class CliService {
  constructor(
    private manager: BotManagerService,
    private logger: LoggerService,
  ) {}

  handleCommand(input: string): void {
    const command = input.trim().toLowerCase();

    switch (command) {
      case 'addorder':
        this.manager.addNormalOrder();
        break;
      case 'addordervip':
        this.manager.addVipOrder();
        break;
      case 'addbot':
        this.manager.addBot();
        break;
      case 'removebot': {
        const removed = this.manager.removeBot();
        if (!removed) {
          this.logger.log('No bots to remove');
        }
        break;
      }
      case 'status':
        this.printStatus();
        break;
      case 'help':
        this.printMenu();
        break;
      default:
        this.logger.log(`Unknown command: "${command}". Type "help" for available commands.`);
        break;
    }
  }

  printMenu(): void {
    this.logger.log("=== McDonald's Bot Manager ===", false);
    this.logger.log('Commands:', false);
    this.logger.log('  addOrder    - New Normal Order', false);
    this.logger.log('  addOrderVIP - New VIP Order', false);
    this.logger.log('  addBot      - Add a Bot', false);
    this.logger.log('  removeBot   - Remove a Bot', false);
    this.logger.log('  status      - View Status', false);
    this.logger.log('  help        - Show this menu', false);
    this.logger.log('  q           - Quit', false);
    this.logger.log('', false);
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
}
