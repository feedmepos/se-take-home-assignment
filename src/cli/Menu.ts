import readline from 'readline';
import { Order } from '../models/Order';
import { OrderQueue } from '../services/OrderQueue';
import { BotManager } from '../services/BotManager';
import { ILogger } from '../services/Logger';

export class Menu {
  private rl: readline.Interface;
  private nextOrderId = 1001;
  private allOrders: Order[] = [];

  constructor(
    private queue: OrderQueue,
    private botManager: BotManager,
    private logger: ILogger,
  ) {
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }

  start(): void {
    this.showMenu();
  }

  private showMenu(): void {
    console.log("\n=== McDonald's Order Management ===");
    console.log('1. Add Bot');
    console.log('2. Remove Bot');
    console.log('3. Add Normal Order');
    console.log('4. Add VIP Order');
    console.log('5. Check Bot Status');
    console.log('6. Show Order List');
    console.log('7. Exit');
    this.rl.question('\nSelect option: ', (input) => this.handleInput(input.trim()));
  }

  private handleInput(input: string): void {
    switch (input) {
      case '1':
        this.botManager.addBot();
        break;
      case '2':
        this.botManager.removeBot();
        break;
      case '3':
        this.createOrder(false);
        break;
      case '4':
        this.createOrder(true);
        break;
      case '5':
        console.log('\n--- Bot Status ---');
        console.log(this.botManager.getStatus());
        this.showMenu();
        return;
      case '6':
        this.showOrderList();
        return;
      case '7':
        this.exit();
        return;
      default:
        console.log('Invalid option. Please select 1-7.');
    }
    this.showMenu();
  }

  private createOrder(isVip: boolean): void {
    const order: Order = { id: this.nextOrderId++, isVip, status: 'PENDING' };
    this.allOrders.push(order);
    this.queue.enqueue(order);
    this.logger.log(`Created ${isVip ? 'VIP' : 'Normal'} Order #${order.id} - Status: PENDING`);
    this.botManager.tryAssignToIdleBots();
  }

  private showOrderList(): void {
    const pending = this.queue.getAll();
    console.log('\n--- Pending Orders ---');
    if (pending.length === 0) {
      console.log('No pending orders.');
    } else {
      pending.forEach(order => {
        const type = order.isVip ? '[VIP]' : '[Normal]';
        console.log(`Order #${order.id} ${type} - ${order.status}`);
      });
      console.log(`Total: ${pending.length} order(s)`);
    }
    this.showMenu();
  }

  private exit(): void {
    // Stop all bots and return any in-progress orders to the queue as PENDING
    this.botManager.drainAll();
    const completed = this.allOrders.filter(o => o.status === 'COMPLETE');
    this.logger.writeFinalStatus({
      totalOrders: completed.length,
      vipOrders: completed.filter(o => o.isVip).length,
      normalOrders: completed.filter(o => !o.isVip).length,
      completedOrders: completed.length,
      activeBots: this.botManager.getBotCount(),
      pendingOrders: this.queue.size(),
    });
    this.rl.close();
    process.exit(0);
  }
}
