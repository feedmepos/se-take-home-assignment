import { BotManager } from '../services/BotManager';
import { OrderQueue } from '../services/OrderQueue';
import { NoOpLogger } from '../services/Logger';
import { Order } from '../models/Order';

const PROCESSING_MS = 100;
const TICK_MS = 50;

function makeOrder(id: number, isVip: boolean): Order {
  return { id, isVip, status: 'PENDING' };
}

function createManager(queue: OrderQueue, logger: NoOpLogger): BotManager {
  return new BotManager(queue, logger, PROCESSING_MS, TICK_MS);
}

describe('BotManager', () => {
  let queue: OrderQueue;
  let logger: NoOpLogger;
  let manager: BotManager;

  beforeEach(() => {
    queue = new OrderQueue();
    logger = new NoOpLogger();
    manager = createManager(queue, logger);
  });

  afterEach(() => {
    manager.drainAll();
  });

  it('picks up a pending order when a bot is added', () => {
    const order = makeOrder(1, false);
    queue.enqueue(order);
    manager.addBot();

    expect(order.status).toBe('PROCESSING');
    expect(queue.size()).toBe(0);
  });

  it('bot stays IDLE when no orders are pending', () => {
    manager.addBot();
    expect(manager.getStatus()).toContain('IDLE');
  });

  it('completes an order after processing time elapses', async () => {
    const order = makeOrder(1, false);
    queue.enqueue(order);
    manager.addBot();

    await new Promise(resolve => setTimeout(resolve, PROCESSING_MS + 100));
    expect(order.status).toBe('COMPLETE');
  });

  it('automatically picks up the next order after completing one', async () => {
    const order1 = makeOrder(1, false);
    const order2 = makeOrder(2, false);
    queue.enqueue(order1);
    queue.enqueue(order2);
    manager.addBot();

    await new Promise(resolve => setTimeout(resolve, PROCESSING_MS + 100));
    expect(order1.status).toBe('COMPLETE');
    expect(order2.status).toBe('PROCESSING');
  });

  it('removes the last added bot (LIFO)', () => {
    manager.addBot();
    manager.addBot();
    manager.removeBot();
    expect(manager.getBotCount()).toBe(1);
  });

  it('returns in-progress order to queue when bot is removed', () => {
    const order = makeOrder(1, false);
    queue.enqueue(order);
    manager.addBot();

    expect(order.status).toBe('PROCESSING');
    manager.removeBot();

    expect(order.status).toBe('PENDING');
    expect(queue.size()).toBe(1);
  });

  it('assigns pending orders to idle bots via tryAssignToIdleBots', () => {
    manager.addBot(); // starts IDLE
    const order = makeOrder(1, false);
    queue.enqueue(order);
    manager.tryAssignToIdleBots();

    expect(order.status).toBe('PROCESSING');
  });

  it('processes VIP orders before normal orders', () => {
    const normal = makeOrder(1, false);
    const vip = makeOrder(2, true);
    queue.enqueue(normal);
    queue.enqueue(vip);
    manager.addBot();

    expect(vip.status).toBe('PROCESSING');
    expect(normal.status).toBe('PENDING');
  });

  it('prints a no-bots message when removing from empty list', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    manager.removeBot();
    expect(consoleSpy).toHaveBeenCalledWith('No bots to remove.');
    consoleSpy.mockRestore();
  });

  it('getStatus shows countdown for processing bot', () => {
    const order = makeOrder(1, false);
    queue.enqueue(order);
    manager.addBot();
    const status = manager.getStatus();
    expect(status).toContain('Bot #1');
    expect(status).toContain('left');
  });
});
