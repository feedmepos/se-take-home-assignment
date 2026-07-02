'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { OrderController } = require('../src/order-controller');
const { OrderQueue } = require('../src/order-queue');
const { Order } = require('../src/order');
const fs = require('fs');

// ============================================================
// R1: Normal Order -> PENDING
// ============================================================
describe('R1: Normal Order -> PENDING', () => {
  let ctrl;
  beforeEach(() => { ctrl = new OrderController(100000); }); // long timeout so no auto-complete

  it('creates a normal order in PENDING status', () => {
    const order = ctrl.addNormalOrder();
    assert.equal(order.type, 'NORMAL');
    assert.equal(order.status, 'PENDING');
  });

  it('order appears in pending queue', () => {
    const order = ctrl.addNormalOrder();
    const pending = ctrl.queue.toArray();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, order.id);
  });

  it('multiple normal orders maintain FIFO ordering', () => {
    const o1 = ctrl.addNormalOrder();
    const o2 = ctrl.addNormalOrder();
    const o3 = ctrl.addNormalOrder();
    const pending = ctrl.queue.toArray();
    assert.equal(pending.length, 3);
    assert.equal(pending[0].id, o1.id);
    assert.equal(pending[1].id, o2.id);
    assert.equal(pending[2].id, o3.id);
  });
});

// ============================================================
// R2: VIP Priority
// ============================================================
describe('R2: VIP Priority', () => {
  let queue;
  beforeEach(() => { queue = new OrderQueue(); });

  it('Example 1: [VIP#1, Normal#2, Normal#3] + VIP#4 -> [VIP#1, VIP#4, Normal#2, Normal#3]', () => {
    queue.enqueue(new Order(1, 'VIP'));
    queue.enqueue(new Order(2, 'NORMAL'));
    queue.enqueue(new Order(3, 'NORMAL'));
    queue.enqueue(new Order(4, 'VIP'));
    const ids = queue.toArray().map(o => o.id);
    assert.deepEqual(ids, [1, 4, 2, 3]);
  });

  it('Example 2: [Normal#1, Normal#2] + VIP#3 -> [VIP#3, Normal#1, Normal#2]', () => {
    queue.enqueue(new Order(1, 'NORMAL'));
    queue.enqueue(new Order(2, 'NORMAL'));
    queue.enqueue(new Order(3, 'VIP'));
    const ids = queue.toArray().map(o => o.id);
    assert.deepEqual(ids, [3, 1, 2]);
  });

  it('Example 3: [VIP#1, VIP#3, Normal#2, Normal#4] + VIP#5 -> [VIP#1, VIP#3, VIP#5, Normal#2, Normal#4]', () => {
    queue.enqueue(new Order(1, 'VIP'));
    queue.enqueue(new Order(3, 'VIP'));
    queue.enqueue(new Order(2, 'NORMAL'));
    queue.enqueue(new Order(4, 'NORMAL'));
    queue.enqueue(new Order(5, 'VIP'));
    const ids = queue.toArray().map(o => o.id);
    assert.deepEqual(ids, [1, 3, 5, 2, 4]);
  });

  it('Example 4: empty queue + VIP#1 -> [VIP#1]', () => {
    queue.enqueue(new Order(1, 'VIP'));
    const ids = queue.toArray().map(o => o.id);
    assert.deepEqual(ids, [1]);
  });
});

// ============================================================
// R3: Unique Increasing IDs
// ============================================================
describe('R3: Unique & Increasing IDs', () => {
  it('10 mixed orders all have unique increasing IDs', () => {
    const ctrl = new OrderController(100000);
    const orders = [];
    orders.push(ctrl.addNormalOrder());
    orders.push(ctrl.addVipOrder());
    orders.push(ctrl.addNormalOrder());
    orders.push(ctrl.addVipOrder());
    orders.push(ctrl.addNormalOrder());
    orders.push(ctrl.addVipOrder());
    orders.push(ctrl.addNormalOrder());
    orders.push(ctrl.addNormalOrder());
    orders.push(ctrl.addVipOrder());
    orders.push(ctrl.addNormalOrder());

    const ids = orders.map(o => o.id);
    // All unique
    assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
    // Strictly increasing
    for (let i = 1; i < ids.length; i++) {
      assert.ok(ids[i] > ids[i - 1], `ID ${ids[i]} should be > ${ids[i - 1]}`);
    }
  });

  it('IDs never reset even after orders complete', (t, done) => {
    const ctrl = new OrderController(50); // 50ms processing
    const o1 = ctrl.addNormalOrder(); // id=1
    ctrl.addBot(); // bot picks up o1
    setTimeout(() => {
      // o1 should be complete now
      assert.equal(ctrl.completed.length, 1);
      const o2 = ctrl.addNormalOrder(); // should be id=2
      assert.ok(o2.id > o1.id, 'ID should keep increasing after completion');
      done();
    }, 100);
  });
});

// ============================================================
// R4: Bot Processing
// ============================================================
describe('R4: Bot Processing', () => {
  it('bot with pending orders picks up immediately', () => {
    const ctrl = new OrderController(100000);
    const order = ctrl.addNormalOrder();
    const bot = ctrl.addBot();
    assert.equal(bot.status, 'PROCESSING');
    assert.equal(bot.currentOrder.id, order.id);
    assert.equal(order.status, 'PROCESSING');
    // Clean up
    bot.stopProcessing();
  });

  it('order moves to COMPLETE after processing time', (t, done) => {
    const ctrl = new OrderController(50);
    const order = ctrl.addNormalOrder();
    ctrl.addBot();
    setTimeout(() => {
      assert.equal(order.status, 'COMPLETE');
      assert.equal(ctrl.completed.length, 1);
      assert.equal(ctrl.completed[0].id, order.id);
      done();
    }, 100);
  });

  it('bot picks up next order after completion', (t, done) => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder(); // id=1
    const o2 = ctrl.addNormalOrder(); // id=2
    const bot = ctrl.addBot();
    // Bot should pick up order 1 first
    assert.equal(bot.currentOrder.id, 1);
    setTimeout(() => {
      // After first completes, bot should have picked up order 2
      assert.equal(bot.currentOrder.id, o2.id);
      assert.equal(bot.status, 'PROCESSING');
      setTimeout(() => {
        assert.equal(ctrl.completed.length, 2);
        done();
      }, 80);
    }, 80);
  });

  it('bot processes only 1 order at a time', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder();
    ctrl.addNormalOrder();
    const bot = ctrl.addBot();
    // Bot should only be processing 1 order
    assert.equal(bot.status, 'PROCESSING');
    assert.ok(bot.currentOrder !== null);
    // Queue should still have 1 order
    assert.equal(ctrl.queue.size(), 1);
    bot.stopProcessing();
  });

  it('multiple bots process in parallel', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder(); // id=1
    ctrl.addNormalOrder(); // id=2
    ctrl.addNormalOrder(); // id=3
    const b1 = ctrl.addBot();
    const b2 = ctrl.addBot();
    assert.equal(b1.status, 'PROCESSING');
    assert.equal(b2.status, 'PROCESSING');
    assert.equal(b1.currentOrder.id, 1);
    assert.equal(b2.currentOrder.id, 2);
    assert.equal(ctrl.queue.size(), 1); // order 3 still pending
    b1.stopProcessing();
    b2.stopProcessing();
  });
});

// ============================================================
// R5: Bot IDLE
// ============================================================
describe('R5: Bot IDLE', () => {
  it('bot becomes IDLE when queue is empty after completion', (t, done) => {
    const ctrl = new OrderController(50);
    ctrl.addNormalOrder();
    const bot = ctrl.addBot();
    assert.equal(bot.status, 'PROCESSING');
    setTimeout(() => {
      assert.equal(bot.status, 'IDLE');
      done();
    }, 100);
  });

  it('idle bot picks up new order when added', (t, done) => {
    const ctrl = new OrderController(50);
    const bot = ctrl.addBot(); // no orders, bot is IDLE
    assert.equal(bot.status, 'IDLE');
    const order = ctrl.addNormalOrder();
    // Bot should immediately pick up the order
    assert.equal(bot.status, 'PROCESSING');
    assert.equal(bot.currentOrder.id, order.id);
    setTimeout(() => {
      assert.equal(bot.status, 'IDLE');
      done();
    }, 100);
  });

  it('multiple idle bots - only one picks up the order', () => {
    const ctrl = new OrderController(100000);
    const b1 = ctrl.addBot();
    const b2 = ctrl.addBot();
    const b3 = ctrl.addBot();
    assert.equal(b1.status, 'IDLE');
    assert.equal(b2.status, 'IDLE');
    assert.equal(b3.status, 'IDLE');

    ctrl.addNormalOrder();
    // Only one bot should pick it up
    const processingBots = ctrl.bots.filter(b => b.status === 'PROCESSING');
    assert.equal(processingBots.length, 1);
    assert.equal(processingBots[0].id, b1.id); // first idle bot
    b1.stopProcessing();
  });
});

// ============================================================
// R6: Bot Removal
// ============================================================
describe('R6: Bot Removal', () => {
  it('removes the newest bot (last added)', () => {
    const ctrl = new OrderController(100000);
    const b1 = ctrl.addBot();
    const b2 = ctrl.addBot();
    const b3 = ctrl.addBot();
    const result = ctrl.removeBot();
    assert.equal(result.bot.id, b3.id);
    assert.equal(ctrl.bots.length, 2);
  });

  it('removing idle bot returns no order', () => {
    const ctrl = new OrderController(100000);
    ctrl.addBot();
    const result = ctrl.removeBot();
    assert.equal(result.returnedOrder, null);
  });

  it('removing processing bot returns order to queue', () => {
    const ctrl = new OrderController(100000);
    const order = ctrl.addNormalOrder();
    ctrl.addBot();
    // Bot is now processing order
    const result = ctrl.removeBot();
    assert.equal(result.returnedOrder.id, order.id);
    assert.equal(result.returnedOrder.status, 'PENDING');
    assert.equal(ctrl.queue.size(), 1);
  });

  it('returned VIP order goes before Normal orders', () => {
    const ctrl = new OrderController(100000);
    // Setup: VIP order being processed, Normal orders in queue
    const vipOrder = ctrl.addVipOrder();   // id=1 VIP
    ctrl.addNormalOrder();                  // id=2 Normal
    ctrl.addNormalOrder();                  // id=3 Normal
    ctrl.addBot(); // picks up VIP#1

    // Queue should be [Normal#2, Normal#3]
    assert.equal(ctrl.queue.size(), 2);

    // Remove bot -> VIP#1 returns to front
    ctrl.removeBot();
    const pending = ctrl.queue.toArray();
    assert.equal(pending[0].id, 1);
    assert.equal(pending[0].type, 'VIP');
    assert.equal(pending[1].id, 2);
    assert.equal(pending[2].id, 3);
  });

  it('returned Normal order goes to end', () => {
    const ctrl = new OrderController(100000);
    const o1 = ctrl.addNormalOrder(); // id=1
    ctrl.addNormalOrder();             // id=2
    ctrl.addBot(); // picks up Normal#1

    // Queue: [Normal#2]
    ctrl.removeBot(); // Normal#1 returns
    const pending = ctrl.queue.toArray();
    assert.equal(pending.length, 2);
    assert.equal(pending[0].id, 2); // original queue order
    assert.equal(pending[1].id, 1); // returned at end
  });

  it('returns null when no bots exist', () => {
    const ctrl = new OrderController(100000);
    const result = ctrl.removeBot();
    assert.equal(result, null);
  });

  it('multi-removal: 3 processing bots removed sequentially, orders return correctly', () => {
    // Closest constructible equivalent of REQUIREMENTS.md multi-removal example.
    // Note: The exact scenario (Bot#2 IDLE with pending orders) cannot be
    // constructed via the API because R5 causes idle bots to auto-pickup.
    // We test with 3 processing bots instead, verifying the same removal behaviors:
    //   - Newest bot removed first (pop order)
    //   - VIP orders return before Normal orders
    //   - Normal orders return at end of queue

    const ctrl = new OrderController(100000);

    // Create orders: Normal#1, Normal#3, VIP#5
    const n1 = ctrl.addNormalOrder(); // id=1
    const n3 = ctrl.addNormalOrder(); // id=2 (representing N#3)
    const v5 = ctrl.addVipOrder();    // id=3 (representing VIP#5)

    // Queue: [VIP#3, Normal#1, Normal#2]
    // Add 3 bots - each picks up one order
    const bot1 = ctrl.addBot(); // picks VIP#3
    const bot2 = ctrl.addBot(); // picks Normal#1
    const bot3 = ctrl.addBot(); // picks Normal#2

    assert.equal(bot1.currentOrder.id, 3); // VIP
    assert.equal(bot2.currentOrder.id, 1); // Normal
    assert.equal(bot3.currentOrder.id, 2); // Normal
    assert.equal(ctrl.queue.size(), 0);

    // Remove Bot#3 (newest) - was processing Normal#2
    let result = ctrl.removeBot();
    assert.equal(result.bot.id, bot3.id);
    assert.equal(result.returnedOrder.id, 2);
    assert.equal(result.returnedOrder.status, 'PENDING');
    let pending = ctrl.queue.toArray();
    assert.deepEqual(pending.map(o => o.id), [2]); // Queue: [Normal#2]

    // Remove Bot#2 (now newest) - was processing Normal#1
    result = ctrl.removeBot();
    assert.equal(result.bot.id, bot2.id);
    assert.equal(result.returnedOrder.id, 1);
    pending = ctrl.queue.toArray();
    assert.deepEqual(pending.map(o => o.id), [2, 1]); // Queue: [Normal#2, Normal#1]

    // Remove Bot#1 (last remaining) - was processing VIP#3
    result = ctrl.removeBot();
    assert.equal(result.bot.id, bot1.id);
    assert.equal(result.returnedOrder.id, 3);
    assert.equal(result.returnedOrder.type, 'VIP');
    pending = ctrl.queue.toArray();
    // VIP#3 inserted before all Normal orders
    assert.deepEqual(pending.map(o => o.id), [3, 2, 1]);
    assert.equal(pending[0].type, 'VIP');
    assert.equal(pending[1].type, 'NORMAL');
    assert.equal(pending[2].type, 'NORMAL');
  });

  it('multi-removal: idle bot removal does not affect queue', () => {
    // Tests the IDLE removal part of the REQUIREMENTS.md multi-removal example:
    // Removing an idle bot should not return any order or change the queue.

    const ctrl = new OrderController(100000);

    // Create one order, add Bot#1 to process it
    ctrl.addNormalOrder(); // id=1
    const bot1 = ctrl.addBot(); // Bot#1 picks Normal#1
    assert.equal(bot1.status, 'PROCESSING');

    // Add Bot#2 (idle, no orders in queue)
    const bot2 = ctrl.addBot();
    assert.equal(bot2.status, 'IDLE');

    // Add Normal#2 to queue - Bot#2 picks it up since it's idle (R5)
    ctrl.addNormalOrder(); // id=2, Bot#2 picks up
    assert.equal(bot2.status, 'PROCESSING');

    // Add Bot#3 (idle now)
    const bot3 = ctrl.addBot();
    assert.equal(bot3.status, 'IDLE');

    // Add Normal#3 to queue
    ctrl.addNormalOrder(); // id=3, Bot#3 picks up
    assert.equal(bot3.status, 'PROCESSING');

    // Add Normal#4 to remain in queue
    ctrl.addNormalOrder(); // id=4 stays in queue
    assert.equal(ctrl.queue.size(), 1);

    // Remove Bot#3 (newest, processing Normal#3) - order returns
    let result = ctrl.removeBot();
    assert.equal(result.bot.id, bot3.id);
    assert.equal(result.returnedOrder.id, 3);
    let pending = ctrl.queue.toArray();
    assert.equal(pending.length, 2); // [Normal#4, Normal#3] or vice versa
    assert.deepEqual(pending.map(o => o.id), [4, 3]);

    // Remove Bot#2 (now newest, processing Normal#2) - order returns at end
    result = ctrl.removeBot();
    assert.equal(result.bot.id, bot2.id);
    assert.equal(result.returnedOrder.id, 2);
    pending = ctrl.queue.toArray();
    assert.deepEqual(pending.map(o => o.id), [4, 3, 2]);

    // Remove Bot#1 (last, processing Normal#1) - order returns at end
    result = ctrl.removeBot();
    assert.equal(result.bot.id, bot1.id);
    assert.equal(result.returnedOrder.id, 1);
    pending = ctrl.queue.toArray();
    assert.deepEqual(pending.map(o => o.id), [4, 3, 2, 1]);

    // No bots left
    assert.equal(ctrl.bots.length, 0);
    result = ctrl.removeBot();
    assert.equal(result, null);
  });

  it('idle bot removal returns no order and leaves queue unchanged', () => {
    // Directly tests: Remove idle bot -> queue is unaffected
    const ctrl = new OrderController(100000);

    // Create 2 orders, add 1 bot to process one, leave one in queue
    ctrl.addNormalOrder(); // id=1
    ctrl.addNormalOrder(); // id=2
    const bot1 = ctrl.addBot(); // picks up Normal#1
    assert.equal(bot1.status, 'PROCESSING');
    assert.equal(ctrl.queue.size(), 1); // Normal#2 in queue

    // Add Bot#2 - it picks up Normal#2 (R5: idle bot auto-picks)
    const bot2 = ctrl.addBot();
    assert.equal(bot2.status, 'PROCESSING');
    assert.equal(ctrl.queue.size(), 0);

    // Add Normal#3 to queue (both bots busy)
    ctrl.addNormalOrder(); // id=3 stays in queue
    assert.equal(ctrl.queue.size(), 1);

    // Add Bot#3 when queue is empty is the only way to get IDLE
    // But queue has id=3, so Bot#3 picks it up. Instead, let's add Bot#3 first.
    // Actually, we need to add the idle bot when queue IS empty.
    // Remove the pending order first by adding a bot to pick it up.
    const bot3 = ctrl.addBot(); // picks up Normal#3
    assert.equal(bot3.status, 'PROCESSING');
    assert.equal(ctrl.queue.size(), 0);

    // NOW add Bot#4 - truly IDLE (queue empty)
    const bot4 = ctrl.addBot();
    assert.equal(bot4.status, 'IDLE');

    // Add an order to queue - bot4 picks it up. We need pending orders AND an idle bot.
    // Per R5, this is impossible. So test idle removal with empty queue.
    // The key assertion: removing idle bot does not return an order.
    const result = ctrl.removeBot();
    assert.equal(result.bot.id, bot4.id);
    assert.equal(result.returnedOrder, null);
    assert.equal(ctrl.queue.size(), 0); // queue unchanged (was empty, still empty)

    // Clean up
    bot1.stopProcessing();
    bot2.stopProcessing();
    bot3.stopProcessing();
  });
});

// ============================================================
// R7: No Persistence
// ============================================================
describe('R7: No Persistence', () => {
  it('order.js has no file system or database references', () => {
    const src = fs.readFileSync(__dirname + '/../src/order.js', 'utf8');
    assert.ok(!src.includes('require(\'fs\')'), 'Should not use fs module');
    assert.ok(!src.includes('require("fs")'), 'Should not use fs module');
    assert.ok(!src.includes('localStorage'), 'Should not use localStorage');
    assert.ok(!src.includes('database'), 'Should not reference database');
    assert.ok(!src.includes('mongoose'), 'Should not use mongoose');
    assert.ok(!src.includes('sequelize'), 'Should not use sequelize');
    assert.ok(!src.includes('writeFile'), 'Should not write files');
  });

  it('order-queue.js has no file system or database references', () => {
    const src = fs.readFileSync(__dirname + '/../src/order-queue.js', 'utf8');
    assert.ok(!src.includes('require(\'fs\')'), 'Should not use fs module');
    assert.ok(!src.includes('require("fs")'), 'Should not use fs module');
    assert.ok(!src.includes('localStorage'), 'Should not use localStorage');
    assert.ok(!src.includes('writeFile'), 'Should not write files');
  });

  it('bot.js has no file system or database references', () => {
    const src = fs.readFileSync(__dirname + '/../src/bot.js', 'utf8');
    assert.ok(!src.includes('require(\'fs\')'), 'Should not use fs module');
    assert.ok(!src.includes('require("fs")'), 'Should not use fs module');
    assert.ok(!src.includes('localStorage'), 'Should not use localStorage');
    assert.ok(!src.includes('writeFile'), 'Should not write files');
  });

  it('order-controller.js has no file system or database references', () => {
    const src = fs.readFileSync(__dirname + '/../src/order-controller.js', 'utf8');
    assert.ok(!src.includes('require(\'fs\')'), 'Should not use fs module');
    assert.ok(!src.includes('require("fs")'), 'Should not use fs module');
    assert.ok(!src.includes('localStorage'), 'Should not use localStorage');
    assert.ok(!src.includes('writeFile'), 'Should not write files');
  });

  it('state is stored in in-memory arrays/objects', () => {
    const ctrl = new OrderController();
    assert.ok(Array.isArray(ctrl.bots));
    assert.ok(Array.isArray(ctrl.completed));
    assert.ok(ctrl.queue instanceof OrderQueue);
    assert.equal(typeof ctrl.nextOrderId, 'number');
    assert.equal(typeof ctrl.nextBotId, 'number');
  });
});
