import { describe, it, expect } from 'vitest';
import { Bot } from '../src/models/Bot';
import { Order } from '../src/models/Order';
import { OrderType, BotStatus } from '../src/types';

describe('Bot', () => {
  it('is IDLE with no order when created', () => {
    const bot = new Bot(1);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  it('becomes PROCESSING and holds the order when assigned', () => {
    const bot = new Bot(1);
    const order = new Order(1, OrderType.NORMAL, 0);
    bot.assign(order);
    expect(bot.status).toBe(BotStatus.PROCESSING);
    expect(bot.currentOrder).toBe(order);
  });

  it('returns to IDLE with no order when finished', () => {
    const bot = new Bot(1);
    bot.assign(new Order(1, OrderType.NORMAL, 0));
    bot.finish();
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  it('returns the interrupted order and goes IDLE when aborted', () => {
    const bot = new Bot(1);
    const order = new Order(1, OrderType.NORMAL, 0);
    bot.assign(order);
    const aborted = bot.abort();
    expect(aborted).toBe(order);
    expect(bot.status).toBe(BotStatus.IDLE);
    expect(bot.currentOrder).toBeNull();
  });

  it('returns null when aborting while idle', () => {
    const bot = new Bot(1);
    expect(bot.abort()).toBeNull();
  });
});
