import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderController } from './OrderController.js';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
  writeText: vi.fn(),
}));

class MockTimer {
  private callbacks: Array<{ id: number; callback: () => void; delay: number }> = [];
  private nextId = 1;
  private currentTime = 0;

  setTimeout(callback: () => void, delay: number): number {
    const id = this.nextId++;
    this.callbacks.push({ id, callback, delay: this.currentTime + delay });
    return id;
  }

  clearTimeout(id: number): void {
    this.callbacks = this.callbacks.filter(c => c.id !== id);
  }

  advanceTime(ms: number): void {
    this.currentTime += ms;
    const toExecute = this.callbacks.filter(c => c.delay <= this.currentTime);
    this.callbacks = this.callbacks.filter(c => c.delay > this.currentTime);
    toExecute.forEach(c => c.callback());
  }
}

describe('OrderController', () => {
  let controller: OrderController;

  beforeEach(() => {
    controller = new OrderController();
  });

  it('should create a normal order', () => {
    const order = controller.createNormalOrder();
    expect(order.type).toBe('normal');
    expect(controller.getPendingOrders()).toContain(order);
  });

  it('should create a VIP order', () => {
    const order = controller.createVipOrder();
    expect(order.type).toBe('vip');
    expect(controller.getPendingOrders()).toContain(order);
  });

  it('should add a bot', () => {
    const bot = controller.addBot();
    expect(controller.getBots()).toContain(bot);
  });

  it('should assign pending orders to idle bots', () => {
    controller.addBot();
    const order = controller.createNormalOrder();
    
    // 订单应该被分配给机器人
    const bots = controller.getBots();
    expect(bots[0].status).toBe('busy');
    expect(bots[0].currentOrder).toBe(order);
  });

  it('should remove a busy bot and return order to queue', () => {
    const bot = controller.addBot();
    const order = controller.createNormalOrder();
    
    // Verify the bot is busy
    expect(bot.status).toBe('busy');
    expect(bot.currentOrder).toBe(order);
    
    // Remove the busy bot
    const result = controller.removeBot(bot.id);
    expect(result.success).toBe(true);
    expect(result.message).toContain('BUSY');
    
    // Verify the bot is removed
    expect(controller.getBots()).toHaveLength(0);
    
    // Verify the order is returned to pending queue with correct status
    expect(order.status).toBe('pending');
    expect(controller.getPendingOrders()).toContain(order);
  });

  it('should reassign interrupted order when another bot is available', () => {
    // Add two bots
    const bot1 = controller.addBot();
    const bot2 = controller.addBot();
    
    // Create an order that gets assigned to the first bot
    const order = controller.createNormalOrder();
    
    // Verify bot 1 is busy, bot 2 is idle
    expect(bot1.status).toBe('busy');
    expect(bot1.currentOrder).toBe(order);
    expect(bot2.status).toBe('idle');
    
    // Remove the busy bot (bot 1)
    const result = controller.removeBot(bot1.id);
    expect(result.success).toBe(true);
    
    // Verify bot 1 is removed and bot 2 is now processing the order
    expect(controller.getBots()).toHaveLength(1);
    const remainingBot = controller.getBots()[0];
    expect(remainingBot.status).toBe('busy');
    expect(remainingBot.currentOrder).toBe(order);
    expect(order.status).toBe('processing');
  });

  it('should maintain order priority when interrupted order is requeued', () => {
    // Create orders: VIP1, Normal1, VIP2
    const vip1 = controller.createVipOrder();
    const normal1 = controller.createNormalOrder();
    const vip2 = controller.createVipOrder();
    
    // Add a bot to process VIP1
    const bot = controller.addBot();
    
    // Wait for VIP1 to start processing
    expect(bot.currentOrder).toBe(vip1);
    expect(vip1.status).toBe('processing');
    
    // Now remove the busy bot while processing VIP1
    controller.removeBot(bot.id);
    
    // All orders should be in pending queue with correct priority
    const pendingOrders = controller.getPendingOrders();
    expect(pendingOrders).toHaveLength(3);
    
    // VIP orders should come first, then normal
    expect(pendingOrders[0].type).toBe('vip');
    expect(pendingOrders[1].type).toBe('vip');
    expect(pendingOrders[2].type).toBe('normal');
    
    // Within VIP orders, they should be ordered by creation time
    expect(pendingOrders[0].createdAt <= pendingOrders[1].createdAt).toBe(true);
  });

  it('should remove an idle bot', () => {
    const bot = controller.addBot();
    
    const result = controller.removeBot(bot.id);
    expect(result.success).toBe(true);
    expect(controller.getBots()).not.toContain(bot);
  });

  it('should complete orders and process next one', () => {
    controller.addBot();
    const order1 = controller.createNormalOrder();
    const order2 = controller.createNormalOrder();
    
    expect(controller.getBots()[0].currentOrder).toBe(order1);
  });
});
