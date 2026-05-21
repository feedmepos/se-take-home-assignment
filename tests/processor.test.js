const Bot = require('../src/models/bot');
const Order = require('../src/models/order');
const Processor = require('../src/services/processor');

jest.useFakeTimers();

describe('Processor', () => {
  let logger;
  let processor;

  beforeEach(() => {
    logger = { log: jest.fn() };
    processor = new Processor(logger, 1000); // 缩短 processTime，加快测试
  });

  test('should process VIP orders before Normal', () => {
    const normalOrder = new Order(1001, 'Normal');
    const vipOrder = new Order(1002, 'VIP');

    processor.addOrder(normalOrder);
    processor.addOrder(vipOrder);

    const bot = new Bot(1);
    processor.addBot(bot);

    // advance timer enough to complete first order
    jest.advanceTimersByTime(1000);

    // VIP 先完成
    expect(vipOrder.status).toBe('COMPLETED');
    expect(normalOrder.status).toBe('PROCESSING');

    // Normal完成
    jest.advanceTimersByTime(1000);
    expect(normalOrder.status).toBe('COMPLETED');
  });

  test('should complete order and mark bot idle', () => {
    const bot = new Bot(1);
    processor.addBot(bot);

    const order = new Order(2001, 'Normal');
    processor.addOrder(order);

    expect(bot.status).toBe('PROCESSING');
    expect(order.status).toBe('PROCESSING');

    jest.advanceTimersByTime(1000);

    expect(order.status).toBe('COMPLETED');
    expect(bot.status).toBe('IDLE');
  });

  test('removing bot returns unfinished order to PENDING', () => {
    const bot = new Bot(1);
    processor.addBot(bot);

    const order = new Order(3001, 'Normal');
    processor.addOrder(order);

    expect(bot.status).toBe('PROCESSING');
    expect(order.status).toBe('PROCESSING');

    // remove bot
    processor.removeBot(bot.id);

    expect(processor.bots.length).toBe(0);
    expect(order.status).toBe('PENDING');
  });

  test('should correctly log multiple bots and orders', () => {
    const bot1 = new Bot(1);
    const bot2 = new Bot(2);
    processor.addBot(bot1);
    processor.addBot(bot2);

    const orders = [
      new Order(1, 'Normal'),
      new Order(2, 'VIP'),
      new Order(3, 'Normal'),
      new Order(4, 'VIP')
    ];

    orders.forEach(o => processor.addOrder(o));

    jest.runAllTimers();

    const completed = orders.filter(o => o.status === 'COMPLETED').length;

    expect(completed).toBe(4);
    expect(processor.bots.every(b => b.status === 'IDLE')).toBe(true);
  });

  test('remaining bot continues processing after removing one bot', () => {
    const bot1 = new Bot(1);
    const bot2 = new Bot(2);

    processor.addBot(bot1);
    processor.addBot(bot2);

    const order1 = new Order(1, 'Normal');
    const order2 = new Order(2, 'Normal');
    const order3 = new Order(3, 'Normal');

    processor.addOrder(order1);
    processor.addOrder(order2);
    processor.addOrder(order3);

    processor.removeBot(2);

    jest.runAllTimers();

    expect(order1.status).toBe('COMPLETED');
    expect(order2.status).toBe('COMPLETED');
    expect(order3.status).toBe('COMPLETED');
  });
});