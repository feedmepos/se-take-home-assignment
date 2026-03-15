'use strict';

const { OrderManager } = require('../src/orderManager');

describe('OrderManager', () => {
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new OrderManager({ processingTime: 10000, log: () => {} });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('1. Normal order added to pending queue', () => {
    manager.addNormalOrder();
    expect(manager.pendingQueue).toHaveLength(1);
    expect(manager.pendingQueue[0].type).toBe('Normal');
    expect(manager.pendingQueue[0].status).toBe('PENDING');
  });

  test('2. VIP order inserted before Normal orders', () => {
    manager.addNormalOrder(); // #1001
    manager.addNormalOrder(); // #1002
    manager.addVipOrder();    // #1003 → should be first
    expect(manager.pendingQueue[0].type).toBe('VIP');
    expect(manager.pendingQueue[1].type).toBe('Normal');
    expect(manager.pendingQueue[2].type).toBe('Normal');
  });

  test('3. Multiple VIPs queue behind each other', () => {
    manager.addNormalOrder(); // #1001
    manager.addVipOrder();    // #1002 → position 0
    manager.addVipOrder();    // #1003 → position 1 (after last VIP)
    expect(manager.pendingQueue[0].id).toBe(1002);
    expect(manager.pendingQueue[1].id).toBe(1003);
    expect(manager.pendingQueue[2].id).toBe(1001);
  });

  test('4. Bot picks up oldest VIP order first', () => {
    manager.addNormalOrder(); // #1001
    manager.addVipOrder();    // #1002 → front
    manager.addBot();
    // Bot should have taken #1002 (VIP)
    expect(manager.bots[0].currentOrder.id).toBe(1002);
    expect(manager.bots[0].currentOrder.type).toBe('VIP');
  });

  test('5. Bot becomes IDLE when queue is empty', () => {
    manager.addBot();
    expect(manager.bots[0].status).toBe('IDLE');
    expect(manager.bots[0].currentOrder).toBeNull();
  });

  test('6. Removing bot mid-process returns order to correct position', () => {
    manager.addVipOrder();    // #1001
    manager.addNormalOrder(); // #1002
    manager.addBot();         // takes #1001 (VIP)
    // Bot is processing #1001, pending has [#1002]
    expect(manager.pendingQueue).toHaveLength(1);
    manager.removeBot();
    // #1001 VIP should be back at front
    expect(manager.pendingQueue).toHaveLength(2);
    expect(manager.pendingQueue[0].id).toBe(1001);
    expect(manager.pendingQueue[0].type).toBe('VIP');
    expect(manager.pendingQueue[0].status).toBe('PENDING');
  });

  test('7. Second bot added picks up next pending order', () => {
    manager.addVipOrder();    // #1001
    manager.addNormalOrder(); // #1002
    manager.addBot();         // Bot #1 takes #1001
    manager.addBot();         // Bot #2 takes #1002
    expect(manager.bots[0].currentOrder.id).toBe(1001);
    expect(manager.bots[1].currentOrder.id).toBe(1002);
    expect(manager.pendingQueue).toHaveLength(0);
  });

  test('8. Order numbers are unique and increasing', () => {
    const o1 = manager.addNormalOrder();
    const o2 = manager.addVipOrder();
    const o3 = manager.addNormalOrder();
    expect(o1.id).toBe(1001);
    expect(o2.id).toBe(1002);
    expect(o3.id).toBe(1003);
    expect(new Set([o1.id, o2.id, o3.id]).size).toBe(3);
  });
});
