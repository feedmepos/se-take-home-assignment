import { OrderController } from '../OrderController';

const FAST_MS = 100; // use 100ms processing time in tests

describe('OrderController', () => {
  it('creates a Normal order with PENDING status', () => {
    const controller = new OrderController(() => {}, FAST_MS);
    const order = controller.addOrder('NORMAL');
    expect(order.status).toBe('PENDING');
    expect(order.type).toBe('NORMAL');
  });

  it('creates a VIP order placed before Normal orders in the queue', () => {
    const controller = new OrderController(() => {}, FAST_MS);
    controller.addOrder('NORMAL'); // #1
    controller.addOrder('VIP');   // #2 → should be first in queue

    const status = controller.getStatus();
    expect(status.pendingOrders[0].id).toBe(2);
    expect(status.pendingOrders[0].type).toBe('VIP');
  });

  it('bot immediately picks up a pending order when added', () => {
    const controller = new OrderController(() => {}, FAST_MS);
    controller.addOrder('NORMAL');
    controller.addBot();

    const status = controller.getStatus();
    expect(status.pendingOrders).toHaveLength(0);
    expect(status.bots[0].status).toBe('PROCESSING');
  });

  it('bot completes an order after the processing time', async () => {
    const controller = new OrderController(() => {}, FAST_MS);
    controller.addOrder('NORMAL');
    controller.addBot();

    await controller.waitForCompletion();

    const status = controller.getStatus();
    expect(status.completedOrders).toHaveLength(1);
    expect(status.completedOrders[0].status).toBe('COMPLETE');
  });

  it('bot becomes IDLE when there are no more pending orders', async () => {
    const controller = new OrderController(() => {}, FAST_MS);
    controller.addOrder('NORMAL');
    controller.addBot();

    await controller.waitForCompletion();

    const status = controller.getStatus();
    expect(status.bots[0].status).toBe('IDLE');
  });

  it('removing the newest bot returns its order to the queue at the correct position', () => {
    const controller = new OrderController(() => {}, FAST_MS);
    controller.addOrder('VIP');    // #1
    controller.addOrder('NORMAL'); // #2
    controller.addOrder('NORMAL'); // #3

    controller.addBot(); // Bot#1 → picks VIP#1
    controller.addBot(); // Bot#2 → picks Normal#2
    // Queue: [Normal#3]

    controller.removeBot(); // Bot#2 removed → Normal#2 returned
    // Queue: [Normal#2, Normal#3]  (Normal#2 before Normal#3 since id 2 < 3)

    const status = controller.getStatus();
    expect(status.pendingOrders[0].id).toBe(2);
    expect(status.pendingOrders[1].id).toBe(3);
  });

  it('processes VIP orders before Normal orders with a single bot', async () => {
    const completed: number[] = [];
    const log = (msg: string) => {
      const match = msg.match(/completed (VIP|NORMAL) Order #(\d+)/);
      if (match) completed.push(Number(match[2]));
    };

    const controller = new OrderController(log, FAST_MS);
    controller.addOrder('NORMAL'); // #1
    controller.addOrder('VIP');   // #2 → inserted before #1
    controller.addBot();          // picks VIP#2 first

    await controller.waitForCompletion();

    expect(completed[0]).toBe(2); // VIP#2 completed first
    expect(completed[1]).toBe(1); // Normal#1 completed second
  });
});
