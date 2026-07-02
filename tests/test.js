'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { Order } = require('../src/order');
const { OrderQueue } = require('../src/order-queue');
const { Bot } = require('../src/bot');
const { OrderController } = require('../src/order-controller');
const { getTimestamp, getTimeOnly, getDateOnly } = require('../src/timestamp');

// --- Order Tests ---

describe('Order', () => {
  it('should create with correct defaults', () => {
    const order = new Order(1, 'NORMAL');
    assert.strictEqual(order.id, 1);
    assert.strictEqual(order.type, 'NORMAL');
    assert.strictEqual(order.status, 'PENDING');
    assert.ok(order.createdAt instanceof Date);
    assert.strictEqual(order.pickedUpAt, null);
    assert.strictEqual(order.completedAt, null);
  });

  it('should create VIP order', () => {
    const order = new Order(2, 'VIP');
    assert.strictEqual(order.type, 'VIP');
    assert.strictEqual(order.status, 'PENDING');
  });

  it('should format toString for Normal order', () => {
    const order = new Order(1, 'NORMAL');
    assert.strictEqual(order.toString(), 'Normal Order #1');
  });

  it('should format toString for VIP order', () => {
    const order = new Order(2, 'VIP');
    assert.strictEqual(order.toString(), '⭐ VIP Order #2');
  });
});

// --- OrderQueue Tests ---

describe('OrderQueue', () => {
  it('should maintain FIFO for Normal orders', () => {
    const queue = new OrderQueue();
    const o1 = new Order(1, 'NORMAL');
    const o2 = new Order(2, 'NORMAL');
    const o3 = new Order(3, 'NORMAL');
    queue.enqueue(o1);
    queue.enqueue(o2);
    queue.enqueue(o3);

    assert.strictEqual(queue.dequeue().id, 1);
    assert.strictEqual(queue.dequeue().id, 2);
    assert.strictEqual(queue.dequeue().id, 3);
  });

  it('should insert VIP before Normal', () => {
    const queue = new OrderQueue();
    const o1 = new Order(1, 'NORMAL');
    const o2 = new Order(2, 'NORMAL');
    const o3 = new Order(3, 'VIP');
    queue.enqueue(o1);
    queue.enqueue(o2);
    queue.enqueue(o3);

    assert.strictEqual(queue.dequeue().id, 3); // VIP first
    assert.strictEqual(queue.dequeue().id, 1);
    assert.strictEqual(queue.dequeue().id, 2);
  });

  it('should insert VIP after existing VIPs', () => {
    const queue = new OrderQueue();
    const o1 = new Order(1, 'VIP');
    const o2 = new Order(2, 'NORMAL');
    const o3 = new Order(3, 'VIP');
    queue.enqueue(o1);
    queue.enqueue(o2);
    queue.enqueue(o3);

    assert.strictEqual(queue.dequeue().id, 1); // First VIP
    assert.strictEqual(queue.dequeue().id, 3); // Second VIP
    assert.strictEqual(queue.dequeue().id, 2); // Normal last
  });

  it('should return null when dequeuing from empty queue', () => {
    const queue = new OrderQueue();
    assert.strictEqual(queue.dequeue(), null);
  });

  it('should report correct size', () => {
    const queue = new OrderQueue();
    assert.strictEqual(queue.size(), 0);
    assert.strictEqual(queue.isEmpty(), true);

    queue.enqueue(new Order(1, 'NORMAL'));
    assert.strictEqual(queue.size(), 1);
    assert.strictEqual(queue.isEmpty(), false);
  });

  it('should re-enqueue VIP before Normal', () => {
    const queue = new OrderQueue();
    queue.enqueue(new Order(1, 'NORMAL'));
    queue.enqueue(new Order(2, 'NORMAL'));

    // Simulate VIP order returned from a destroyed bot
    const vipOrder = new Order(3, 'VIP');
    vipOrder.status = 'PENDING';
    queue.enqueue(vipOrder);

    assert.strictEqual(queue.dequeue().id, 3); // VIP goes first
    assert.strictEqual(queue.dequeue().id, 1);
    assert.strictEqual(queue.dequeue().id, 2);
  });

  it('should re-enqueue Normal at end', () => {
    const queue = new OrderQueue();
    queue.enqueue(new Order(1, 'NORMAL'));
    queue.enqueue(new Order(2, 'VIP'));

    const normalOrder = new Order(3, 'NORMAL');
    normalOrder.status = 'PENDING';
    queue.enqueue(normalOrder);

    assert.strictEqual(queue.dequeue().id, 2); // VIP first
    assert.strictEqual(queue.dequeue().id, 1);
    assert.strictEqual(queue.dequeue().id, 3); // Re-enqueued normal at end
  });

  it('should produce correct snapshot format', () => {
    const queue = new OrderQueue();
    queue.enqueue(new Order(1, 'NORMAL'));
    queue.enqueue(new Order(2, 'VIP'));
    queue.enqueue(new Order(3, 'NORMAL'));

    assert.strictEqual(queue.snapshot(), '⭐#2 → #1 → #3');
  });

  it('should handle empty snapshot', () => {
    const queue = new OrderQueue();
    assert.strictEqual(queue.snapshot(), '(empty)');
  });
});

// --- Bot Tests ---

describe('Bot', () => {
  it('should create with correct defaults', () => {
    const bot = new Bot(1);
    assert.strictEqual(bot.id, 1);
    assert.strictEqual(bot.status, 'IDLE');
    assert.strictEqual(bot.currentOrder, null);
    assert.strictEqual(bot.processingTime, 10000);
    assert.ok(bot.idleSince instanceof Date);
    assert.strictEqual(bot.timer, null);
  });

  it('should accept injectable processing time', () => {
    const bot = new Bot(1, 50);
    assert.strictEqual(bot.processingTime, 50);
  });

  it('should change status when processing', (_, done) => {
    const bot = new Bot(1, 50);
    const order = new Order(1, 'NORMAL');

    bot.startProcessing(order, () => {
      done();
    });

    assert.strictEqual(bot.status, 'PROCESSING');
    assert.strictEqual(bot.currentOrder, order);
    assert.strictEqual(order.status, 'PROCESSING');
    assert.ok(order.pickedUpAt instanceof Date);
  });

  it('should complete after processing time', (_, done) => {
    const bot = new Bot(1, 50);
    const order = new Order(1, 'NORMAL');

    bot.startProcessing(order, (completedOrder) => {
      assert.strictEqual(completedOrder.status, 'COMPLETE');
      assert.ok(completedOrder.completedAt instanceof Date);
      assert.strictEqual(bot.status, 'IDLE');
      assert.strictEqual(bot.currentOrder, null);
      done();
    });
  });

  it('should stop processing and return order', () => {
    const bot = new Bot(1, 10000);
    const order = new Order(1, 'NORMAL');

    bot.startProcessing(order, () => {
      // Should not fire
      assert.fail('onComplete should not fire after stopProcessing');
    });

    const returned = bot.stopProcessing();
    assert.strictEqual(returned, order);
    assert.strictEqual(returned.status, 'PENDING');
    assert.strictEqual(bot.status, 'IDLE');
    assert.strictEqual(bot.currentOrder, null);
    assert.strictEqual(bot.timer, null);
  });

  it('should return null when stopping idle bot', () => {
    const bot = new Bot(1);
    const returned = bot.stopProcessing();
    assert.strictEqual(returned, null);
  });
});

// --- OrderController Tests (Integration) ---

describe('OrderController', () => {
  it('should add normal order to pending queue', () => {
    const ctrl = new OrderController(50);
    const order = ctrl.addNormalOrder();

    assert.strictEqual(order.id, 1);
    assert.strictEqual(order.type, 'NORMAL');
    assert.strictEqual(order.status, 'PENDING');
    assert.strictEqual(ctrl.queue.size(), 1);
  });

  it('should add VIP order before normal in queue', () => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder();  // #1
    ctrl.addVipOrder();     // #2

    const first = ctrl.queue.dequeue();
    assert.strictEqual(first.id, 2); // VIP
    assert.strictEqual(first.type, 'VIP');

    const second = ctrl.queue.dequeue();
    assert.strictEqual(second.id, 1); // Normal
  });

  it('should auto-increment order IDs', () => {
    const ctrl = new OrderController(50);
    const o1 = ctrl.addNormalOrder();
    const o2 = ctrl.addVipOrder();
    const o3 = ctrl.addNormalOrder();

    assert.strictEqual(o1.id, 1);
    assert.strictEqual(o2.id, 2);
    assert.strictEqual(o3.id, 3);
  });

  it('should assign pending order to new bot immediately', (_, done) => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder(); // #1 pending

    ctrl.onBotCompleted = (bot, order) => {
      assert.strictEqual(order.id, 1);
      assert.strictEqual(order.status, 'COMPLETE');
      done();
    };

    const bot = ctrl.addBot();
    assert.strictEqual(bot.status, 'PROCESSING');
    assert.strictEqual(ctrl.queue.size(), 0);
  });

  it('should remove newest bot (last added)', () => {
    const ctrl = new OrderController(50);
    ctrl.addBot(); // #1
    ctrl.addBot(); // #2

    const removed = ctrl.removeBot();
    assert.strictEqual(removed.bot.id, 2);
    assert.strictEqual(ctrl.bots.length, 1);
    assert.strictEqual(ctrl.bots[0].id, 1);
  });

  it('should return order to queue when removing bot mid-processing', () => {
    const ctrl = new OrderController(10000); // Long processing time
    ctrl.addNormalOrder();  // #1
    ctrl.addBot();          // Bot picks up #1

    assert.strictEqual(ctrl.queue.size(), 0);
    assert.strictEqual(ctrl.bots[0].status, 'PROCESSING');

    const removed = ctrl.removeBot();
    assert.strictEqual(removed.returnedOrder.id, 1);
    assert.strictEqual(removed.returnedOrder.status, 'PENDING');
    assert.strictEqual(ctrl.queue.size(), 1);
  });

  it('should return VIP order to correct queue position after bot removal', () => {
    const ctrl = new OrderController(10000);
    ctrl.addNormalOrder();  // #1 Normal
    ctrl.addVipOrder();     // #2 VIP → queue: [VIP#2, Normal#1]
    ctrl.addBot();          // Bot picks up VIP#2

    // Add more normal orders
    ctrl.addNormalOrder();  // #3 Normal → queue: [Normal#1, Normal#3]

    // Remove bot mid-processing VIP #2
    const removed = ctrl.removeBot();
    assert.strictEqual(removed.returnedOrder.id, 2);

    // VIP #2 should be first in queue (before all normals)
    const first = ctrl.queue.dequeue();
    assert.strictEqual(first.id, 2);
    assert.strictEqual(first.type, 'VIP');
  });

  it('should make bot idle when queue is empty after completion', (_, done) => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder(); // #1

    ctrl.onBotIdle = (bot) => {
      assert.strictEqual(bot.status, 'IDLE');
      assert.strictEqual(ctrl.queue.isEmpty(), true);
      done();
    };

    ctrl.addBot();
  });

  it('should process next order after bot completes', (_, done) => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder();  // #1
    ctrl.addNormalOrder();  // #2

    let completionCount = 0;
    ctrl.onBotCompleted = (bot, order) => {
      completionCount++;
      if (completionCount === 2) {
        assert.strictEqual(ctrl.completed.length, 2);
        assert.strictEqual(ctrl.completed[0].id, 1);
        assert.strictEqual(ctrl.completed[1].id, 2);
        done();
      }
    };

    ctrl.addBot();
  });

  it('should return null when removing bot with no bots', () => {
    const ctrl = new OrderController(50);
    assert.strictEqual(ctrl.removeBot(), null);
  });

  it('should handle idle bot picking up new order', (_, done) => {
    const ctrl = new OrderController(50);

    // Add bot first — it will be idle
    const bot = ctrl.addBot();
    assert.strictEqual(bot.status, 'IDLE');

    let completionCount = 0;
    ctrl.onBotCompleted = () => {
      completionCount++;
      if (completionCount === 1) {
        done();
      }
    };

    // New order should be picked up by idle bot
    const order = ctrl.addNormalOrder();
    assert.strictEqual(bot.status, 'PROCESSING');
    assert.strictEqual(ctrl.queue.isEmpty(), true);
  });

  it('should run full end-to-end scenario', (_, done) => {
    const ctrl = new OrderController(50);

    // Create orders
    ctrl.addNormalOrder();  // #1
    ctrl.addVipOrder();     // #2 → should be first
    ctrl.addNormalOrder();  // #3

    // Verify queue order: VIP#2, Normal#1, Normal#3
    assert.strictEqual(ctrl.queue.size(), 3);
    const snapshot = ctrl.queue.snapshot();
    assert.strictEqual(snapshot, '⭐#2 → #1 → #3');

    let totalCompleted = 0;
    ctrl.onBotCompleted = (bot, order) => {
      totalCompleted++;
    };

    // Add 2 bots — they pick up VIP#2 and Normal#1
    ctrl.addBot();  // Bot #1 picks up VIP#2
    ctrl.addBot();  // Bot #2 picks up Normal#1

    assert.strictEqual(ctrl.queue.size(), 1); // Normal#3 remains

    // Wait for all processing
    setTimeout(() => {
      // All 3 orders should be completed (2 bots process 3 orders)
      assert.strictEqual(totalCompleted, 3);
      assert.strictEqual(ctrl.completed.length, 3);
      assert.strictEqual(ctrl.queue.isEmpty(), true);

      // Verify completion order: VIP#2 first, then Normal#1 and Normal#3
      assert.strictEqual(ctrl.completed[0].id, 2); // VIP#2
      done();
    }, 300);
  });

  it('should report correct status', () => {
    const ctrl = new OrderController(10000);
    ctrl.addNormalOrder();  // #1
    ctrl.addVipOrder();     // #2
    ctrl.addBot();          // Bot picks up VIP#2

    const status = ctrl.getStatus();
    assert.strictEqual(status.summary.totalOrders, 2);
    assert.strictEqual(status.summary.vipCount, 1);
    assert.strictEqual(status.summary.normalCount, 1);
    assert.strictEqual(status.summary.pendingCount, 1);
    assert.strictEqual(status.summary.processingCount, 1);
    assert.strictEqual(status.summary.completedCount, 0);
    assert.strictEqual(status.summary.activeBots, 1);
    assert.strictEqual(status.summary.workingBots, 1);
    assert.strictEqual(status.summary.idleBots, 0);

    // Clean up timer
    ctrl.bots[0].stopProcessing();
  });
});

// --- Persistence Tests (R7: No Data Persistence) ---

describe('Persistence (R7)', () => {
  it('should start with clean in-memory state', () => {
    const ctrl = new OrderController(50);
    assert.strictEqual(ctrl.queue.size(), 0);
    assert.strictEqual(ctrl.bots.length, 0);
    assert.strictEqual(ctrl.completed.length, 0);
  });

  it('should not share state between controller instances', () => {
    const ctrlA = new OrderController(50);
    ctrlA.addNormalOrder();
    ctrlA.addVipOrder();
    ctrlA.addBot();

    // A fresh instance simulates an app restart — no persisted data
    const ctrlB = new OrderController(50);
    assert.strictEqual(ctrlB.queue.size(), 0);
    assert.strictEqual(ctrlB.bots.length, 0);
    assert.strictEqual(ctrlB.completed.length, 0);

    // New instance IDs restart from 1 (counter is not persisted)
    const order = ctrlB.addNormalOrder();
    assert.strictEqual(order.id, 1);

    // Clean up any running timers on ctrlA
    ctrlA.bots.forEach((b) => b.stopProcessing());
  });

  it('should hold all state in memory (no filesystem writes on operations)', () => {
    const fs = require('fs');
    const path = require('path');
    const ctrl = new OrderController(50);

    const dirBefore = fs.readdirSync(path.join(__dirname, '..')).sort();
    ctrl.addNormalOrder();
    ctrl.addVipOrder();
    ctrl.addBot();
    ctrl.removeBot();
    const dirAfter = fs.readdirSync(path.join(__dirname, '..')).sort();

    // Controller operations must not create or remove any files
    assert.deepStrictEqual(dirAfter, dirBefore);

    ctrl.bots.forEach((b) => b.stopProcessing());
  });
});

// --- Timestamp Tests ---

describe('Timestamp', () => {
  it('should return YYYY-MM-DD HH:MM:SS format', () => {
    const ts = getTimestamp();
    assert.match(ts, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('should return HH:MM:SS format', () => {
    const t = getTimeOnly();
    assert.match(t, /^\d{2}:\d{2}:\d{2}$/);
  });

  it('should return YYYY-MM-DD format', () => {
    const d = getDateOnly();
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  });
});
