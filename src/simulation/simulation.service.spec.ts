import { SimulationService } from './simulation.service';
import { OrderService } from '../order/order.service';
import { BotService } from '../bot/bot.service';
import { LoggerService } from '../logger/logger.service';
import { OrderType } from '../order/order.types';

jest.useFakeTimers();

describe('SimulationService', () => {
  let orders: jest.Mocked<OrderService>;
  let bots: jest.Mocked<BotService>;
  let logger: jest.Mocked<LoggerService>;
  let service: SimulationService;

  beforeEach(() => {
    jest.clearAllTimers();

    orders = {
      createOrder: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;

    bots = {
      addBot: jest.fn(),
      removeBot: jest.fn(),
      onNewOrder: jest.fn(),
      getSummary: jest.fn().mockReturnValue({
        total: 5,
        vip: 3,
        normal: 2,
        completed: 5,
        pending: 0,
        activeBots: 1,
      }),
      hasActiveWork: jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValue(false),
    } as unknown as jest.Mocked<BotService>;

    logger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = new SimulationService(orders, bots, logger);
  });

  it('drives the expected simulation flow', async () => {
    const runPromise = service.run();

    // Advance all timers (delay + polling)
    await jest.runAllTimersAsync();
    await runPromise;

    // Bots
    expect(bots.addBot).toHaveBeenCalledTimes(2);
    expect(bots.removeBot).toHaveBeenCalledTimes(1);

    // Orders (exact sequence matters)
    expect(orders.createOrder).toHaveBeenCalledTimes(4);
    expect(orders.createOrder).toHaveBeenNthCalledWith(1, OrderType.NORMAL);
    expect(orders.createOrder).toHaveBeenNthCalledWith(2, OrderType.VIP);
    expect(orders.createOrder).toHaveBeenNthCalledWith(3, OrderType.NORMAL);
    expect(orders.createOrder).toHaveBeenNthCalledWith(4, OrderType.VIP);

    // Scheduler triggers
    expect(bots.onNewOrder).toHaveBeenCalled();

    // Logs
    const logs = logger.log.mock.calls.map(c => c[0] as string);

    expect(logs[0]).toContain(
      "McDonald's Order Management System - Simulation Results",
    );

    expect(logs).toContain('[System initialized with 0 bots]');
    expect(logs).toContain('Final Status:');
  });
});
