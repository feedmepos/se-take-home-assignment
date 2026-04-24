'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { OrderController } = require('../src/orderController');

describe('Order IDs', () => {
  it('are unique and increasing across both order types', () => {
    const ctrl = new OrderController();
    const o1 = ctrl.addNormalOrder();
    const o2 = ctrl.addVIPOrder();
    const o3 = ctrl.addNormalOrder();
    assert.equal(o1.id, 1);
    assert.equal(o2.id, 2);
    assert.equal(o3.id, 3);
  });
});

describe('Normal Order', () => {
  it('appends to end of pending queue', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // #1
    ctrl.addNormalOrder(); // #2
    assert.equal(ctrl.pending[0].id, 1);
    assert.equal(ctrl.pending[1].id, 2);
  });
});

describe('VIP Order', () => {
  it('is placed before all Normal orders', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // #1
    ctrl.addVIPOrder();    // #2 → before #1
    assert.equal(ctrl.pending[0].id, 2);
    assert.equal(ctrl.pending[1].id, 1);
  });

  it('is placed after existing VIP orders', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // #1
    ctrl.addVIPOrder();    // #2
    ctrl.addVIPOrder();    // #3 → after #2, before #1
    assert.equal(ctrl.pending[0].id, 2);
    assert.equal(ctrl.pending[1].id, 3);
    assert.equal(ctrl.pending[2].id, 1);
  });

  it('goes to front when queue contains only Normal orders', () => {
    const ctrl = new OrderController();
    ctrl.addNormalOrder(); // #1
    ctrl.addNormalOrder(); // #2
    ctrl.addVIPOrder();    // #3 → before both normals
    assert.equal(ctrl.pending[0].id, 3);
  });
});

describe('Bot — order processing', () => {
  it('processes orders in priority queue order (VIP first)', async () => {
    const ctrl = new OrderController(20);
    ctrl.addNormalOrder(); // #1
    ctrl.addVIPOrder();    // #2 → first in queue
    ctrl.addBot();

    const [, order] = await new Promise(r => ctrl.once('orderCompleted', (...a) => r(a)));
    assert.equal(order.id, 2);
    ctrl.removeBot();
  });

  it('moves completed order to complete array and clears it from pending', async () => {
    const ctrl = new OrderController(20);
    ctrl.addNormalOrder();
    ctrl.addBot();

    await new Promise(r => ctrl.once('orderCompleted', r));
    assert.equal(ctrl.pending.length, 0);
    assert.equal(ctrl.complete.length, 1);
    ctrl.removeBot();
  });

  it('bot becomes IDLE when no orders remain', async () => {
    const ctrl = new OrderController(20);
    ctrl.addNormalOrder();
    ctrl.addBot();

    await new Promise(r => ctrl.once('botIdle', r));
    assert.equal(ctrl.bots[0].idle, true);
  });

  it('idle bot picks up a new order immediately', async () => {
    const ctrl = new OrderController(20);
    ctrl.addBot(); // no orders yet — bot will become idle

    const pickedUp = new Promise(r => ctrl.once('botPickedUp', (bot, order) => r(order)));
    ctrl.addNormalOrder();

    const order = await pickedUp;
    assert.equal(order.id, 1);
    ctrl.removeBot();
  });

  it('two bots process two orders concurrently', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder(); // #1
    ctrl.addNormalOrder(); // #2
    ctrl.addBot();
    ctrl.addBot();

    assert.notEqual(ctrl.bots[0].currentOrder, null);
    assert.notEqual(ctrl.bots[1].currentOrder, null);
    assert.equal(ctrl.pending.length, 0);

    ctrl.removeBot();
    ctrl.removeBot();
  });
});

describe('Bot — removal', () => {
  it('removes the newest bot (LIFO)', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder();
    ctrl.addNormalOrder();
    const b1 = ctrl.addBot();
    const b2 = ctrl.addBot();

    const removed = ctrl.removeBot();
    assert.equal(removed.id, b2.id);
    assert.equal(ctrl.bots.length, 1);
    assert.equal(ctrl.bots[0].id, b1.id);
    ctrl.removeBot();
  });

  it('returns interrupted order to pending', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder(); // #1
    ctrl.addBot();

    assert.equal(ctrl.bots[0].currentOrder.id, 1);
    ctrl.removeBot();

    assert.equal(ctrl.bots.length, 0);
    assert.equal(ctrl.pending.length, 1);
    assert.equal(ctrl.pending[0].id, 1);
  });

  it('returned VIP order is placed before Normal orders', () => {
    const ctrl = new OrderController(100000);
    ctrl.addNormalOrder(); // #1
    ctrl.addVIPOrder();    // #2 → first in queue
    ctrl.addBot();         // picks up #2(VIP)

    assert.equal(ctrl.bots[0].currentOrder.id, 2);
    ctrl.removeBot(); // returns #2(VIP)

    assert.equal(ctrl.pending[0].id, 2); // VIP before Normal
    assert.equal(ctrl.pending[1].id, 1);
  });

  it('returned Normal order goes to end of pending', () => {
    const ctrl = new OrderController(100000);
    ctrl.addVIPOrder();    // #1 — first in queue
    ctrl.addNormalOrder(); // #2 — second in queue
    ctrl.addBot();         // picks up #1(VIP)
    ctrl.addBot();         // picks up #2(Normal)

    ctrl.removeBot(); // removes Bot #2, returns #2(Normal)
    assert.equal(ctrl.pending[ctrl.pending.length - 1].id, 2);

    ctrl.removeBot();
  });

  it('returns null when no bots exist', () => {
    const ctrl = new OrderController();
    assert.equal(ctrl.removeBot(), null);
  });
});
