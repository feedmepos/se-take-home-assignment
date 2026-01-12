import { Order, OrderType, OrderStatus } from '../types/Order.js';
import { Bot, BotStatus } from '../types/Bot.js';

/**
 * OrderController manages the order processing system with bots.
 * Handles order creation, bot management, and order processing with priority queue.
 */
export class OrderController {
  private orders: Order[];
  private bots: Bot[];
  private nextOrderId: number;
  private nextBotId: number;
  private output: string[];

  constructor() {
    this.orders = [];
    this.bots = [];
    this.nextOrderId = 1001;
    this.nextBotId = 1;
    this.output = [];
  }

  /**
   * Formats a date to HH:MM:SS format
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Logs a message with timestamp to both console and output array
   */
  log(message: string, silent: boolean = false): void {
    const timestamp = this.formatTime(new Date());
    const logMessage = `[${timestamp}] ${message}`;
    this.output.push(logMessage);
    if (!silent) {
      console.log(logMessage);
    }
  }

  /**
   * Creates a new normal order and adds it to the queue
   */
  createNormalOrder(): Order {
    const order = new Order(this.nextOrderId++, 'NORMAL');
    this.orders.push(order);
    this.log(`Created ${order.toString()} - Status: ${order.status}`);
    this.assignOrdersToBots();
    return order;
  }

  /**
   * Creates a new VIP order and inserts it with priority (after VIP, before NORMAL)
   */
  createVIPOrder(): Order {
    const order = new Order(this.nextOrderId++, 'VIP');
    
    // Insert VIP order maintaining priority (after all VIP, before all NORMAL)
    this.insertOrderWithPriority(order);
    
    this.log(`Created ${order.toString()} - Status: ${order.status}`);
    this.assignOrdersToBots();
    return order;
  }

  /**
   * Adds a new bot to the system and assigns pending orders if available
   */
  addBot(): Bot {
    const bot = new Bot(this.nextBotId++);
    this.bots.push(bot);
    this.log(`${bot.toString()} created - Status: ACTIVE`);
    this.assignOrdersToBots();
    return bot;
  }

  /**
   * Removes the newest bot from the system.
   * If the bot is processing an order, returns it to PENDING queue.
   */
  removeBot(): Bot | null {
    if (this.bots.length === 0) {
      this.log('No bots available to remove');
      return null;
    }

    // Remove the newest bot (last in array)
    const bot = this.bots.pop()!;
    
    const currentOrder = bot.currentOrderId 
      ? this.orders.find(o => o.id === bot.currentOrderId)
      : null;

    if (bot.status === 'PROCESSING' && currentOrder) {
      // Clear the timeout first
      if (bot.processingTimeout) {
        clearTimeout(bot.processingTimeout);
        bot.processingTimeout = null;
      }
      
      // Return order to PENDING
      currentOrder.status = 'PENDING';
      
      // Re-insert order back into queue (maintain VIP priority)
      this.orders = this.orders.filter(o => o.id !== currentOrder.id);
      this.insertOrderWithPriority(currentOrder);
      
      this.log(`${bot.toString()} destroyed while processing ${currentOrder.toString()} - Order returned to PENDING`);
    } else {
      this.log(`${bot.toString()} destroyed while IDLE`);
    }
    
    this.assignOrdersToBots();
    return bot;
  }

  /**
   * Assigns pending orders to idle bots based on priority
   */
  private assignOrdersToBots(): void {
    // Find pending orders
    const pendingOrders = this.orders.filter(o => o.status === 'PENDING');
    if (pendingOrders.length === 0) return;

    // Find idle bots
    const idleBots = this.bots.filter(b => b.status === 'IDLE');
    if (idleBots.length === 0) return;

    // Assign orders to bots (orders are already sorted by priority)
    for (let i = 0; i < Math.min(pendingOrders.length, idleBots.length); i++) {
      const order = pendingOrders[i];
      const bot = idleBots[i];
      this.processOrder(bot, order);
    }
  }

  /**
   * Processes an order with a bot (10 second delay)
   */
  private processOrder(bot: Bot, order: Order): void {
    bot.status = 'PROCESSING';
    bot.currentOrderId = order.id;
    order.status = 'PROCESSING';
    
    this.log(`${bot.toString()} picked up ${order.toString()} - Status: ${order.status}`);

    // Process order for 10 seconds
    bot.processingTimeout = setTimeout(() => {
      order.status = 'COMPLETE';
      bot.status = 'IDLE';
      bot.currentOrderId = null;
      bot.processingTimeout = null;
      
      this.log(`${bot.toString()} completed ${order.toString()} - Status: ${order.status} (Processing time: 10s)`);
      
      // Try to assign next order to this bot or any other idle bots
      this.assignOrdersToBots();
      
      // Check if this bot is still IDLE after assignment attempt
      if (bot.status === 'IDLE') {
        const hasPendingOrders = this.orders.some(o => o.status === 'PENDING');
        if (!hasPendingOrders) {
          this.log(`${bot.toString()} is now IDLE - No pending orders`);
        }
      }
    }, 10000); // 10 seconds
  }

  /**
   * Inserts an order into the queue maintaining VIP priority:
   * - VIP orders go after all existing VIP orders, before all NORMAL orders
   * - NORMAL orders go after all VIP orders
   */
  private insertOrderWithPriority(order: Order): void {
    if (order.type === 'VIP') {
      // Find the last VIP order index
      const lastVIPIndex = this.orders.map((o, i) => ({ o, i }))
        .filter(({ o }) => o.type === 'VIP')
        .map(({ i }) => i)
        .pop();
      
      if (lastVIPIndex !== undefined) {
        // Insert after the last VIP order
        this.orders.splice(lastVIPIndex + 1, 0, order);
      } else {
        // No VIP orders exist, insert at the beginning
        this.orders.unshift(order);
      }
    } else {
      // NORMAL order: find first NORMAL order or append to end
      const normalOrderIndex = this.orders.findIndex(o => o.type === 'NORMAL');
      if (normalOrderIndex === -1) {
        this.orders.push(order);
      } else {
        this.orders.splice(normalOrderIndex, 0, order);
      }
    }
  }

  /**
   * Gets the current status of the system
   */
  getStatus() {
    const pendingOrders = this.orders.filter(o => o.status === 'PENDING');
    const processingOrders = this.orders.filter(o => o.status === 'PROCESSING');
    const completedOrders = this.orders.filter(o => o.status === 'COMPLETE');
    const activeBots = this.bots.filter(b => b.status === 'PROCESSING');
    const idleBots = this.bots.filter(b => b.status === 'IDLE');
    
    return {
      orders: {
        pending: pendingOrders.length,
        processing: processingOrders.length,
        complete: completedOrders.length,
        total: this.orders.length
      },
      bots: {
        active: activeBots.length,
        idle: idleBots.length,
        total: this.bots.length
      }
    };
  }

  /**
   * Gets all orders (returns a copy to prevent external modification)
   */
  getAllOrders(): Order[] {
    return [...this.orders];
  }

  /**
   * Gets all bots (returns a copy to prevent external modification)
   */
  getAllBots(): Bot[] {
    return [...this.bots];
  }

  /**
   * Gets all log output as a single string
   */
  getOutput(): string {
    return this.output.join('\n');
  }

  /**
   * Resets the controller (useful for testing)
   */
  reset(): void {
    // Clear all timeouts
    this.bots.forEach(bot => {
      if (bot.processingTimeout) {
        clearTimeout(bot.processingTimeout);
      }
    });
    
    this.orders = [];
    this.bots = [];
    this.nextOrderId = 1001;
    this.nextBotId = 1;
    this.output = [];
  }
}
