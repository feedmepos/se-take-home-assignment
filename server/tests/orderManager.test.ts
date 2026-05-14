import { OrderManager } from '../orderManager.js';

export function testOrderManager(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  console.log('\n📋 Testing OrderManager...\n');

  // Test 1: Create normal order
  try {
    const manager = new OrderManager();
    const order = manager.createOrder('NORMAL');
    if (order.id === 1 && order.type === 'NORMAL' && order.status === 'PENDING') {
      console.log('✓ Test 1: Create normal order - PASSED');
      passed++;
    } else {
      console.log('✗ Test 1: Create normal order - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 1: Create normal order - ERROR:', error);
    failed++;
  }

  // Test 2: Create VIP order
  try {
    const manager = new OrderManager();
    const order = manager.createOrder('VIP');
    if (order.id === 1 && order.type === 'VIP' && order.status === 'PENDING') {
      console.log('✓ Test 2: Create VIP order - PASSED');
      passed++;
    } else {
      console.log('✗ Test 2: Create VIP order - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 2: Create VIP order - ERROR:', error);
    failed++;
  }

  // Test 3: Order IDs are unique and incrementing
  try {
    const manager = new OrderManager();
    const order1 = manager.createOrder('NORMAL');
    const order2 = manager.createOrder('NORMAL');
    const order3 = manager.createOrder('VIP');
    if (order1.id === 1 && order2.id === 2 && order3.id === 3) {
      console.log('✓ Test 3: Order IDs are unique and incrementing - PASSED');
      passed++;
    } else {
      console.log('✗ Test 3: Order IDs are unique and incrementing - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 3: Order IDs are unique and incrementing - ERROR:', error);
    failed++;
  }

  // Test 4: Create bot
  try {
    const manager = new OrderManager();
    const bot = manager.createBot();
    if (bot.id === 1 && bot.status === 'IDLE') {
      console.log('✓ Test 4: Create bot - PASSED');
      passed++;
    } else {
      console.log('✗ Test 4: Create bot - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 4: Create bot - ERROR:', error);
    failed++;
  }

  // Test 5: Bot IDs are unique and incrementing
  try {
    const manager = new OrderManager();
    const bot1 = manager.createBot();
    const bot2 = manager.createBot();
    const bot3 = manager.createBot();
    if (bot1.id === 1 && bot2.id === 2 && bot3.id === 3) {
      console.log('✓ Test 5: Bot IDs are unique and incrementing - PASSED');
      passed++;
    } else {
      console.log('✗ Test 5: Bot IDs are unique and incrementing - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 5: Bot IDs are unique and incrementing - ERROR:', error);
    failed++;
  }

  // Test 6: Remove bot returns correct bot
  try {
    const manager = new OrderManager();
    manager.createBot();
    manager.createBot();
    const removedBot = manager.removeBot();
    if (removedBot && removedBot.id === 2) {
      console.log('✓ Test 6: Remove bot returns correct bot - PASSED');
      passed++;
    } else {
      console.log('✗ Test 6: Remove bot returns correct bot - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 6: Remove bot returns correct bot - ERROR:', error);
    failed++;
  }

  // Test 7: Remove bot from empty list returns null
  try {
    const manager = new OrderManager();
    const removedBot = manager.removeBot();
    if (removedBot === null) {
      console.log('✓ Test 7: Remove bot from empty list returns null - PASSED');
      passed++;
    } else {
      console.log('✗ Test 7: Remove bot from empty list returns null - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 7: Remove bot from empty list returns null - ERROR:', error);
    failed++;
  }

  // Test 8: Get state returns correct structure
  try {
    const manager = new OrderManager();
    manager.createOrder('NORMAL');
    manager.createBot();
    const state = manager.getState();
    if (
      state.orders.length === 1 &&
      state.bots.length === 1 &&
      state.orders[0].id === 1 &&
      state.bots[0].id === 1
    ) {
      console.log('✓ Test 8: Get state returns correct structure - PASSED');
      passed++;
    } else {
      console.log('✗ Test 8: Get state returns correct structure - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 8: Get state returns correct structure - ERROR:', error);
    failed++;
  }

  // Test 9: Clear all resets state
  try {
    const manager = new OrderManager();
    manager.createOrder('NORMAL');
    manager.createOrder('VIP');
    manager.createBot();
    manager.clearAll();
    const state = manager.getState();
    if (state.orders.length === 0 && state.bots.length === 0) {
      console.log('✓ Test 9: Clear all resets state - PASSED');
      passed++;
    } else {
      console.log('✗ Test 9: Clear all resets state - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 9: Clear all resets state - ERROR:', error);
    failed++;
  }

  // Test 10: VIP orders have higher priority
  try {
    const manager = new OrderManager();
    const normal1 = manager.createOrder('NORMAL');
    const vip1 = manager.createOrder('VIP');
    const normal2 = manager.createOrder('NORMAL');
    const state = manager.getState();
    // VIP should be processed before normal orders
    const pendingOrders = state.orders.filter((o) => o.status === 'PENDING');
    if (
      pendingOrders.length === 3 &&
      pendingOrders[0].type === 'VIP' &&
      pendingOrders[1].type === 'NORMAL' &&
      pendingOrders[2].type === 'NORMAL'
    ) {
      console.log('✓ Test 10: VIP orders have higher priority - PASSED');
      passed++;
    } else {
      console.log('✗ Test 10: VIP orders have higher priority - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✗ Test 10: VIP orders have higher priority - ERROR:', error);
    failed++;
  }

  return { passed, failed };
}
