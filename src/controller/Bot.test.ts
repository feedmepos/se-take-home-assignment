import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bot } from './Bot.js';
import { createOrder } from './Order.js';

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

describe('Bot', () => {
  let timer: MockTimer;

  beforeEach(() => {
    timer = new MockTimer();
  });

  it('should create a bot with incrementing ID', () => {
    const bot1 = new Bot(timer as any);
    const bot2 = new Bot(timer as any);
    expect(bot1.id).toBeLessThan(bot2.id);
  });

  it('should start with idle status', () => {
    const bot = new Bot(timer as any);
    expect(bot.status).toBe('idle');
  });

  it('should process an order and emit events', async () => {
    const bot = new Bot(timer as any);
    const order = createOrder('normal');
    const events: Array<{ type: string; data: any }> = [];

    bot.on('bot:started', (data) => events.push({ type: 'started', data }));
    bot.on('bot:completed', (data) => events.push({ type: 'completed', data }));
    bot.on('bot:idle', (data) => events.push({ type: 'idle', data }));

    bot.startProcessing(order);
    expect(bot.status).toBe('busy');
    expect(bot.currentOrder).toBe(order);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('started');

    timer.advanceTime(10000);

    expect(bot.status).toBe('idle');
    expect(bot.currentOrder).toBeUndefined();
    expect(events.length).toBe(3);
    expect(events[1].type).toBe('completed');
    expect(events[2].type).toBe('idle');
  });

  it('should not process an order if busy', () => {
    const bot = new Bot(timer as any);
    const order1 = createOrder('normal');
    const order2 = createOrder('vip');
    const errorEvents: any[] = [];

    bot.on('bot:error', (data) => errorEvents.push(data));

    bot.startProcessing(order1);
    bot.startProcessing(order2);

    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].error.message).toContain('already busy');
  });

  it('should destroy if busy and return interrupted order', () => {
    const bot = new Bot(timer as any);
    const order = createOrder('normal');
    const destroyedEvents: any[] = [];

    bot.on('bot:destroyed', (data) => destroyedEvents.push(data));

    bot.startProcessing(order);
    const result = bot.destroy();

    expect(result.success).toBe(true);
    expect(result.interruptedOrder).toBe(order);
    expect(bot.status).toBe('destroyed');
    expect(destroyedEvents.length).toBe(1);
  });

  it('should destroy if idle', () => {
    const bot = new Bot(timer as any);
    const destroyedEvents: any[] = [];

    bot.on('bot:destroyed', (data) => destroyedEvents.push(data));

    const result = bot.destroy();

    expect(result.success).toBe(true);
    expect(bot.status).toBe('destroyed');
    expect(destroyedEvents.length).toBe(1);
  });
});
