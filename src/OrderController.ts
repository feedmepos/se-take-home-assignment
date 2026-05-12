import { Order, OrderType, OrderStatus, BotStatus, Logger } from './types';
import { OrderQueue } from './OrderQueue';
import { Bot } from './Bot';

/**
 * Main controller that manages bots and order queue
 */
export class OrderController {
  private queue: OrderQueue;
  private bots: Bot[] = [];
  private completedOrders: Order[] = [];
  private nextBotId: number = 1;
  private logger: Logger;
  private onStateChange?: () => void;

  constructor(logger?: Logger, onStateChange?: () => void) {
    this.queue = new OrderQueue();
    this.logger = logger || { log: console.log };
    this.onStateChange = onStateChange;
  }

  /**
   * Create a new normal order
   */
  createNormalOrder(): Order {
    const order = this.queue.createOrder(OrderType.NORMAL);
    this.logger.log(`[${this.timestamp()}] Created Normal Order #${order.id} - Status: ${order.status}`);
    this.notifyStateChange();
    this.tryAssignOrders();
    return order;
  }

  /**
   * Create a new VIP order
   */
  createVIPOrder(): Order {
    const order = this.queue.createOrder(OrderType.VIP);
    this.logger.log(`[${this.timestamp()}] Created VIP Order #${order.id} - Status: ${order.status}`);
    this.notifyStateChange();
    this.tryAssignOrders();
    return order;
  }

  /**
   * Add a new bot
   */
  addBot(): Bot {
    const bot = new Bot(this.nextBotId++);
    bot.setOnOrderComplete((botId, order) => this.handleOrderComplete(botId, order));
    bot.setOnBotIdle((botId) => this.handleBotIdle(botId));
    this.bots.push(bot);
    this.logger.log(`[${this.timestamp()}] Bot #${bot.id} created - Status: ${BotStatus.ACTIVE}`);
    this.notifyStateChange();
    this.tryAssignOrders();
    return bot;
  }

  /**
   * Remove the newest bot
   * If the bot is processing an order, the order returns to PENDING queue
   */
  removeBot(): Bot | null {
    if (this.bots.length === 0) {
      this.logger.log(`[${this.timestamp()}] No bots to remove`);
      return null;
    }

    // Get the newest bot (last in array)
    const bot = this.bots[this.bots.length - 1];
    const wasProcessing = bot.isProcessing;
    const processingOrder = bot.stopProcessing();

    // Remove bot from list
    this.bots.pop();
    bot.destroy();

    if (wasProcessing && processingOrder) {
      this.logger.log(`[${this.timestamp()}] Bot #${bot.id} destroyed while processing Order #${processingOrder.id}`);
      // Return the order to the pending queue
      this.queue.reAddOrder(processingOrder);
      this.logger.log(`[${this.timestamp()}] Order #${processingOrder.id} returned to PENDING queue`);
    } else {
      this.logger.log(`[${this.timestamp()}] Bot #${bot.id} destroyed while IDLE`);
    }

    this.notifyStateChange();
    this.tryAssignOrders();
    return bot;
  }

  /**
   * Try to assign pending orders to idle bots
   */
  private tryAssignOrders(): void {
    const idleBots = this.bots.filter(b => b.isIdle);

    for (const bot of idleBots) {
      if (!this.queue.hasPendingOrders()) break;

      const order = this.queue.getNextOrder()!;
      bot.startProcessing(order);
      this.logger.log(`[${this.timestamp()}] Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: ${OrderStatus.PROCESSING}`);
      this.notifyStateChange();
    }
  }

  /**
   * Handle order completion
   */
  private handleOrderComplete(botId: number, order: Order): void {
    order.status = OrderStatus.COMPLETE;
    this.completedOrders.push(order);
    this.logger.log(`[${this.timestamp()}] Bot #${botId} completed ${order.type} Order #${order.id} - Status: ${order.status} (Processing time: 10s)`);
    this.notifyStateChange();
  }

  /**
   * Handle bot becoming idle
   */
  private handleBotIdle(botId: number): void {
    if (!this.queue.hasPendingOrders()) {
      this.logger.log(`[${this.timestamp()}] Bot #${botId} is now IDLE - No pending orders`);
    }
    this.notifyStateChange();
    // Try to assign more orders
    this.tryAssignOrders();
  }

  /**
   * Get current status summary
   */
  getStatus(): {
    pendingOrders: Order[];
    processingOrders: { botId: number; order: Order }[];
    completedOrders: Order[];
    bots: { id: number; status: BotStatus; currentOrderId?: number }[];
  } {
    const processingOrders = this.bots
      .filter(b => b.isProcessing)
      .map(b => ({
        botId: b.id,
        order: b.currentOrder!
      }));

    return {
      pendingOrders: this.queue.getPendingOrders(),
      processingOrders,
      completedOrders: [...this.completedOrders],
      bots: this.bots.map(b => ({
        id: b.id,
        status: b.isProcessing ? BotStatus.ACTIVE : BotStatus.IDLE,
        currentOrderId: b.currentOrder?.id
      }))
    };
  }

  /**
   * Print current status to logger
   */
  printStatus(): void {
    const status = this.getStatus();

    this.logger.log('');
    this.logger.log('=== Current Status ===');
    this.logger.log(`PENDING (${status.pendingOrders.length}): ${
      status.pendingOrders.length > 0
        ? status.pendingOrders.map(o => `[${o.type}] #${o.id}`).join(', ')
        : 'None'
    }`);
    this.logger.log(`PROCESSING (${status.processingOrders.length}): ${
      status.processingOrders.length > 0
        ? status.processingOrders.map(p => `Bot#${p.botId} -> [${p.order.type}] #${p.order.id}`).join(', ')
        : 'None'
    }`);
    this.logger.log(`COMPLETE (${status.completedOrders.length}): ${
      status.completedOrders.length > 0
        ? status.completedOrders.map(o => `[${o.type}] #${o.id}`).join(', ')
        : 'None'
    }`);
    this.logger.log(`BOTS (${status.bots.length}): ${
      status.bots.map(b => `Bot#${b.id}(${b.status}${b.currentOrderId ? ': #' + b.currentOrderId : ''})`).join(', ') || 'None'
    }`);
    this.logger.log('=====================');
    this.logger.log('');
  }

  /**
   * Format timestamp as HH:MM:SS
   */
  private timestamp(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  /**
   * Notify state change listener
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  /**
   * Get bots count
   */
  getBotCount(): number {
    return this.bots.length;
  }

  /**
   * Get completed orders count
   */
  getCompletedCount(): number {
    return this.completedOrders.length;
  }

  /**
   * Get pending orders count
   */
  getPendingCount(): number {
    return this.queue.getPendingCount();
  }

  /**
   * Cleanup all bots (for graceful shutdown)
   */
  cleanup(): void {
    for (const bot of this.bots) {
      bot.destroy();
    }
    this.bots = [];
  }
}
