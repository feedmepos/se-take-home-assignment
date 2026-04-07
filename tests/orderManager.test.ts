import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Silence logger output during tests
import logger from '../src/logger.js';
logger.log = () => {};
logger.write = () => {};

import { OrderManager } from '../src/orderManager.js';
import { ORDER_TYPE, ORDER_STATUS } from '../src/order.js';
import { PROCESSING_TIME_MS } from '../src/bot.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe('Order', () => {
  it('increments order IDs sequentially', () => {
    const manager = new OrderManager();
    const o1 = manager.addNormalOrder();
    const o2 = manager.addNormalOrder();
    const o3 = manager.addVIPOrder();
    assert.equal(o1.id, 1);
    assert.equal(o2.id, 2);
    assert.equal(o3.id, 3);
  });

  it('new Normal order starts as PENDING', () => {
    const manager = new OrderManager();
    const order = manager.addNormalOrder();
    assert.equal(order.status, ORDER_STATUS.PENDING);
  });

  it('new VIP order starts as PENDING', () => {
    const manager = new OrderManager();
    const order = manager.addVIPOrder();
    assert.equal(order.status, ORDER_STATUS.PENDING);
  });

  it('new VVIP order starts as PENDING', () => {
    const manager = new OrderManager();
    const order = manager.addVVIPOrder();
    assert.equal(order.status, ORDER_STATUS.PENDING);
  });
});

describe('Priority Queue', () => {
  it('VIP order is placed before Normal orders', () => {
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addNormalOrder(); // #2
    manager.addVIPOrder();    // #3 — should jump to front

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].type, ORDER_TYPE.VIP);
    assert.equal(queue[0].id, 3);
  });

  it('VIP order is placed behind existing VIP orders', () => {
    const manager = new OrderManager();
    manager.addVIPOrder();    // #1 VIP
    manager.addNormalOrder(); // #2 Normal
    manager.addVIPOrder();    // #3 VIP — should go after #1 VIP, before #2 Normal

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].id, 1); // VIP #1
    assert.equal(queue[1].id, 3); // VIP #3
    assert.equal(queue[2].id, 2); // Normal #2
  });

  it('VVIP order is placed before VIP and Normal orders', () => {
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addVIPOrder();    // #2
    manager.addVVIPOrder();   // #3 — should jump to front, ahead of VIP #2

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].type, ORDER_TYPE.VVIP);
    assert.equal(queue[0].id, 3);
    assert.equal(queue[1].type, ORDER_TYPE.VIP);
    assert.equal(queue[1].id, 2);
    assert.equal(queue[2].type, ORDER_TYPE.NORMAL);
    assert.equal(queue[2].id, 1);
  });

  it('second VVIP order is placed after first VVIP, before VIP', () => {
    const manager = new OrderManager();
    manager.addVVIPOrder();   // #1 VVIP
    manager.addVIPOrder();    // #2 VIP
    manager.addNormalOrder(); // #3 Normal
    manager.addVVIPOrder();   // #4 VVIP — should go after #1 VVIP, before #2 VIP

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].id, 1); // VVIP #1
    assert.equal(queue[1].id, 4); // VVIP #4
    assert.equal(queue[2].id, 2); // VIP #2
    assert.equal(queue[3].id, 3); // Normal #3
  });

  it('multiple Normal orders queue in arrival order', () => {
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addNormalOrder(); // #2
    manager.addNormalOrder(); // #3

    const queue = manager.getPendingQueue();
    assert.deepEqual(queue.map((o) => o.id), [1, 2, 3]);
  });
});

describe('Bot - add bot', () => {
  afterEach(() => {
    // Clean up any lingering timers by removing all bots forcefully
  });

  it('adding a bot with no pending orders leaves bot idle', (_t) => {
    const manager = new OrderManager();
    manager.addBot();
    const bots = manager.getBots();
    assert.equal(bots.length, 1);
    assert.equal(bots[0].currentOrder, null);
  });

  it('adding a bot when there is a pending order picks up the order', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    const order = manager.addNormalOrder();
    manager.addBot();

    assert.equal(order.status, ORDER_STATUS.PROCESSING);
    assert.equal(manager.getPendingQueue().length, 0);
    t.mock.timers.reset();
  });

  it('adding a bot picks up the highest priority (VIP) order first', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    const vip = manager.addVIPOrder();   // #2 — should be processed first

    manager.addBot();
    assert.equal(vip.status, ORDER_STATUS.PROCESSING);
    t.mock.timers.reset();
  });

  it('adding a bot picks up VVIP before VIP before Normal', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addVIPOrder();    // #2
    const vvip = manager.addVVIPOrder(); // #3 — should be processed first

    manager.addBot();
    assert.equal(vvip.status, ORDER_STATUS.PROCESSING);
    t.mock.timers.reset();
  });
});

describe('Bot - order completion', () => {
  it('order moves to COMPLETE after processing time elapses', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    const order = manager.addNormalOrder();
    manager.addBot();

    assert.equal(order.status, ORDER_STATUS.PROCESSING);

    t.mock.timers.tick(PROCESSING_TIME_MS);

    assert.equal(order.status, ORDER_STATUS.COMPLETE);
    assert.equal(manager.getCompletedOrders().length, 1);
    t.mock.timers.reset();
  });

  it('after completing an order the bot picks up the next pending order', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addNormalOrder(); // #2
    manager.addBot();         // picks up #1

    t.mock.timers.tick(PROCESSING_TIME_MS); // #1 completes; bot picks up #2

    const bots = manager.getBots();
    assert.equal(bots[0].currentOrder!.id, 2);
    t.mock.timers.reset();
  });

  it('bot becomes idle when no more pending orders remain', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addBot();

    t.mock.timers.tick(PROCESSING_TIME_MS);

    const bots = manager.getBots();
    assert.equal(bots[0].currentOrder, null);
    assert.equal(manager.getPendingQueue().length, 0);
    t.mock.timers.reset();
  });
});

describe('Bot - idle bot picks up new order', () => {
  it('idle bot immediately processes a newly added order', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addBot(); // idle — no orders yet

    const order = manager.addNormalOrder(); // should trigger dispatch

    assert.equal(order.status, ORDER_STATUS.PROCESSING);
    t.mock.timers.reset();
  });
});

describe('Bot - remove bot', () => {
  it('removing a bot with no bots logs gracefully and returns null', () => {
    const manager = new OrderManager();
    const result = manager.removeBot();
    assert.equal(result, null);
  });

  it('removing an idle bot decreases bot count', () => {
    const manager = new OrderManager();
    manager.addBot();
    manager.removeBot();
    assert.equal(manager.getBots().length, 0);
  });

  it('removing a processing bot returns its order to PENDING queue', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    const order = manager.addNormalOrder();
    manager.addBot(); // picks up order

    assert.equal(order.status, ORDER_STATUS.PROCESSING);

    manager.removeBot();

    assert.equal(order.status, ORDER_STATUS.PENDING);
    assert.equal(manager.getPendingQueue().length, 1);
    assert.equal(manager.getPendingQueue()[0].id, order.id);
    t.mock.timers.reset();
  });

  it('returned VIP order is re-inserted ahead of Normal orders', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addNormalOrder(); // #1
    manager.addNormalOrder(); // #2
    const vip = manager.addVIPOrder(); // #3 — jumps to front; bot picks it up

    manager.addBot(); // picks up VIP #3

    manager.addNormalOrder(); // #4 — now in queue

    manager.removeBot(); // returns VIP #3 to queue — should be at front

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].type, ORDER_TYPE.VIP);
    assert.equal(queue[0].id, vip.id);
    t.mock.timers.reset();
  });

  it('returned VVIP order is re-inserted ahead of VIP and Normal orders', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addVIPOrder();    // #1 VIP
    manager.addNormalOrder(); // #2 Normal
    const vvip = manager.addVVIPOrder(); // #3 VVIP — jumps to front; bot picks it up

    manager.addBot(); // picks up VVIP #3

    manager.addNormalOrder(); // #4 — now in queue

    manager.removeBot(); // returns VVIP #3 — should land at front, ahead of VIP #1

    const queue = manager.getPendingQueue();
    assert.equal(queue[0].type, ORDER_TYPE.VVIP);
    assert.equal(queue[0].id, vvip.id);
    assert.equal(queue[1].type, ORDER_TYPE.VIP);
    t.mock.timers.reset();
  });

  it('newest bot is removed (last in, first out)', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const manager = new OrderManager();
    manager.addBot(); // Bot #1
    manager.addBot(); // Bot #2

    manager.removeBot(); // should remove Bot #2

    const bots = manager.getBots();
    assert.equal(bots.length, 1);
    assert.equal(bots[0].id, 1);
    t.mock.timers.reset();
  });
});
