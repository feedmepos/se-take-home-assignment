import { BotService } from '../bot.service';
import { OrderService } from '../../order/order.service';
import { LoggerService } from '../../logger/logger.service';
import { OrderType } from '../../order/order.types';

jest.useFakeTimers();

describe('BotService', () => {
  let orders: OrderService;
  let bots: BotService;
  let logger: Pick<LoggerService, 'log'>;

  beforeEach(() => {
    jest.clearAllTimers();
    logger = { log: jest.fn() };
    orders = new OrderService(logger as LoggerService);
    bots = new BotService(orders, logger as LoggerService);
  });

  it('should log completion for processed order after timeout', () => {
    orders.createOrder(OrderType.NORMAL);
    const addLogSpy = logger.log as jest.Mock;

    bots.addBot();
    bots.onNewOrder();

    // Fast-forward time by more than processing duration (10s)
    jest.advanceTimersByTime(11_000);

    // Expect at least one log entry indicating completion
    const messages = addLogSpy.mock.calls.map((c) => c[0] as string);
    expect(messages.some((m) => m.includes('complete'))).toBe(true);
  });

  it('should return in-flight order to pending when newest bot is removed', () => {
    const order = orders.createOrder(OrderType.NORMAL);

    bots.addBot();
    bots.onNewOrder();

    // Immediately remove bot while it is likely processing the order
    bots.removeBot();

    // Now the order should be back in pending queue and picked by a new bot
    const addLogSpy = logger.log as jest.Mock;

    bots.addBot();
    bots.onNewOrder();

    jest.advanceTimersByTime(11_000);

    const messages = addLogSpy.mock.calls.map((c) => c[0] as string);

    // We expect to see completion log for the original order id
    const completedForOrder = messages.filter(
      (m) => m.includes('complete') && m.includes(`#${order.id}`),
    );

    expect(completedForOrder.length).toBeGreaterThan(0);
  });

  it('should handle removeBot when there are no bots', () => {
    const result = bots.removeBot();
    expect(result).toBeUndefined();
    const logSpy = logger.log as jest.Mock;
    const messages = logSpy.mock.calls.map((c) => c[0] as string);
    expect(messages.some((m) => m.includes('No bots to destroy'))).toBe(true);
  });

  it('hasActiveWork should reflect pending orders and bot activity', () => {
    expect(bots.hasActiveWork()).toBe(false);

    orders.createOrder(OrderType.NORMAL);
    expect(bots.hasActiveWork()).toBe(true);

    bots.addBot();
    bots.onNewOrder();
    expect(bots.hasActiveWork()).toBe(true);

    jest.advanceTimersByTime(11_000);
    expect(bots.hasActiveWork()).toBe(false);
  });

  it('removes idle bot safely', () => {
    bots.addBot();
    bots.removeBot();
  
    expect(bots.getBots().length).toBe(0);
  });
});

