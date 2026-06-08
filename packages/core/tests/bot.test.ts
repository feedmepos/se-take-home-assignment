import { describe, it, expect } from 'vitest';
import { Bot } from '../src/models/Bot';
import { Order } from '../src/models/Order';
import { OrderType, BotStatus, PROCESSING_DURATION_MS } from '../src/types';

describe('Bot', () => {
  it('is IDLE with no order when created', () => {
    const bot = new Bot(1, PROCESSING_DURATION_MS);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
    expect(bot.startedAt).toBeNull();
    expect(bot.expectedFinishAt).toBeNull();
  });

  it('becomes PROCESSING and holds the order when assigned', () => {
    const bot = new Bot(1, PROCESSING_DURATION_MS);
    const order = new Order(1, OrderType.NORMAL, 0);
    bot.assign(order, 0);
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrder).toBe(order);
  });

  it('records the start time and exposes the expected finish time when assigned', () => {
    const bot = new Bot(1, 5_000);
    bot.assign(new Order(1, OrderType.VIP, 0), 3_000);
    expect(bot.startedAt).toBe(3_000);
    expect(bot.expectedFinishAt).toBe(8_000); // 3000 + 5000
  });

  it('returns to IDLE with no order and clears timing when finished', () => {
    const bot = new Bot(1, PROCESSING_DURATION_MS);
    bot.assign(new Order(1, OrderType.NORMAL, 0), 1_000);
    bot.finish();
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
    expect(bot.startedAt).toBeNull();
    expect(bot.expectedFinishAt).toBeNull();
  });

  it('returns the interrupted order, goes IDLE and clears timing when aborted', () => {
    const bot = new Bot(1, PROCESSING_DURATION_MS);
    const order = new Order(1, OrderType.NORMAL, 0);
    bot.assign(order, 2_000);
    const aborted = bot.abort();
    expect(aborted).toBe(order);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
    expect(bot.startedAt).toBeNull();
    expect(bot.expectedFinishAt).toBeNull();
  });

  it('returns null when aborting while idle', () => {
    const bot = new Bot(1, PROCESSING_DURATION_MS);
    expect(bot.abort()).toBeNull();
  });
});
