import { createOrder, type Order } from './Order.js';
import { Bot } from './Bot.js';
import { PriorityQueue } from './PriorityQueue.js';
import { log } from '../utils/logger.js';
import { formatProductName, formatProductPrice } from './Product.js';

export class OrderController {
  private pendingQueue = new PriorityQueue();
  private bots: Map<number, Bot> = new Map();
  private completedOrders: Order[] = [];
  private orderMap: Map<number, Order> = new Map();
  private onChangeCallback?: () => void;

  constructor() {
    // 初始化时可以做一些设置
  }

  setOnChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  /**
   * 创建普通订单
   */
  createNormalOrder(): Order {
    const order = createOrder('normal');
    this.orderMap.set(order.id, order);
    this.pendingQueue.enqueue(order);
    log(
      `Created Normal Order #${order.id} - Product: ${formatProductName(order.product)} ${formatProductPrice(order.product)} - Status: PENDING`
    );
    this.processPendingOrders();
    this.notifyChange();
    return order;
  }

  /**
   * 创建 VIP 订单
   */
  createVipOrder(): Order {
    const order = createOrder('vip');
    this.orderMap.set(order.id, order);
    this.pendingQueue.enqueue(order);
    log(
      `Created VIP Order #${order.id} - Product: ${formatProductName(order.product)} ${formatProductPrice(order.product)} - Status: PENDING`
    );
    this.processPendingOrders();
    this.notifyChange();
    return order;
  }

  /**
   * 添加机器人
   */
  addBot(): Bot {
    const bot = new Bot();
    this.bots.set(bot.id, bot);

    // 订阅机器人事件
    this.setupBotListeners(bot);

    log(`Bot #${bot.id} created - Status: ACTIVE`);
    this.processPendingOrders();
    this.notifyChange();
    return bot;
  }

  /**
   * 设置机器人事件监听
   */
  private setupBotListeners(bot: Bot): void {
    // 机器人开始处理订单
    bot.on('bot:started', ({ botId, order }) => {
      const orderType = order.type === 'vip' ? 'VIP' : 'Normal';
      log(
        `Bot #${botId} started cooking: ${formatProductName(order.product)} ${formatProductPrice(order.product)} - ${orderType} Order #${order.id} - Status: PROCESSING`
      );
      order.status = 'processing';
      this.notifyChange();
    });

    // 机器人完成订单
    bot.on('bot:completed', ({ botId, order, processingTime }) => {
      order.status = 'completed';
      order.completedAt = new Date();
      this.completedOrders.push(order);

      const orderType = order.type === 'vip' ? 'VIP' : 'Normal';
      log(
        `Bot #${botId} completed cooking: ${formatProductName(order.product)} - ${orderType} Order #${order.id} - Status: COMPLETE (Processing time: ${processingTime}s)`
      );
      this.notifyChange();
    });

    // 机器人变为空闲
    bot.on('bot:idle', ({ botId }) => {
      // 尝试分配新订单
      this.processPendingOrders();
    });

    // 机器人被销毁
    bot.on('bot:destroyed', ({ botId }) => {
      this.bots.delete(botId);
      this.notifyChange();
    });

    // 机器人错误
    bot.on('bot:error', ({ botId, error, currentOrder }) => {
      log(`Bot #${botId} error: ${error.message}`);
      this.notifyChange();
    });
  }

  /**
   * 移除机器人
   */
  removeBot(botId?: number): { success: boolean; message: string } {
    let targetId: number | undefined = botId;
    if (!targetId) {
      const allBots = Array.from(this.bots.keys()).sort((a, b) => b - a);
      if (allBots.length > 0) {
        targetId = allBots[0];
      }
    }

    if (!targetId || !this.bots.has(targetId)) {
      const msg = botId ? `Bot #${botId} not found` : 'No bots available to remove';
      log(msg);
      return { success: false, message: msg };
    }

    const bot = this.bots.get(targetId)!;
    const result = bot.destroy();

    if (result.success) {
      log(result.message);

      // 如果机器人正在处理订单，将订单返回到队列
      if (result.interruptedOrder) {
        const order = result.interruptedOrder;
        order.status = 'pending';
        this.pendingQueue.enqueue(order);
        log(`Order #${order.id} returned to pending queue`);

        // 触发重新分配订单
        this.processPendingOrders();
      }
    } else {
      log(result.message);
    }

    return result;
  }

  /**
   * 处理待处理订单，推模式分配给空闲机器人
   */
  private processPendingOrders(): void {
    for (const bot of this.bots.values()) {
      if (bot.status === 'idle') {
        const order = this.pendingQueue.dequeue();
        if (order) {
          bot.startProcessing(order);
        } else {
          log(`Bot #${bot.id} is now IDLE - No pending orders`);
        }
      }
    }
  }

  // Getters for UI
  getPendingOrders(): Order[] {
    return this.pendingQueue.getAll();
  }

  getPendingVipOrders(): Order[] {
    return this.pendingQueue.getVipOrders();
  }

  getPendingNormalOrders(): Order[] {
    return this.pendingQueue.getNormalOrders();
  }

  getBots(): Bot[] {
    return Array.from(this.bots.values()).sort((a, b) => a.id - b.id);
  }

  getCompletedOrders(): Order[] {
    return [...this.completedOrders];
  }

  getStats() {
    const vipCount = this.completedOrders.filter((o) => o.type === 'vip').length;
    const normalCount = this.completedOrders.filter((o) => o.type === 'normal').length;
    return {
      totalOrders: this.completedOrders.length,
      vipCount,
      normalCount,
      activeBots: this.bots.size,
      pendingOrders: this.pendingQueue.size,
    };
  }

  // 计算机器人处理剩余时间（秒）
  getBotRemainingSeconds(bot: Bot): number {
    return bot.getRemainingSeconds();
  }
}
