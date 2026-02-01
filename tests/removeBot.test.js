//unit tests of removeBot()
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  addOrder,
  addBot,
  removeBot,
  bots,
  pendingOrders,
  completedOrders,
  allOrders,
  OrderType,
  processOrders
} from '../orderSystem.js';

const RESULT_FILE = path.join('scripts', 'result.txt');

// Reset system before each test
function resetSystem() {
  fs.writeFileSync(RESULT_FILE, '', { encoding: 'utf8' });
  pendingOrders.length = 0;
  allOrders.length = 0;
  completedOrders.length = 0;
  bots.length = 0;
}

// Helper to run a test (async)
async function runTest(name, fn) {
  try {
    resetSystem();
    await fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
  }
}

// ===== Sequentially run all tests =====
async function runAllTests() {

  await runTest('Remove idle bot', async () => {
    addBot(); // #1
    removeBot(); // remove the only bot

    // Bots array should be empty
    assert.strictEqual(bots.length, 0);

    // Check log mentions idle bot destroyed
    const logs = fs.readFileSync(RESULT_FILE, 'utf8');
    assert.ok(logs.includes('destroyed while IDLE'));
  });

  await runTest('Remove bot while processing an order, switch order status back to PENDING', async () => {
    addOrder(OrderType.NORMAL); // #1001
    addBot(); // #1 picks up order

    // Wait briefly to ensure bot picks up order
    await new Promise(resolve => setTimeout(resolve, 100));

    // Bot should have currentOrder
    assert.strictEqual(bots[0].currentOrder.id, allOrders[0].id);

    // Remove bot while processing
    removeBot();

    // Bots array should be empty
    assert.strictEqual(bots.length, 0);

    // Order should be back in pendingOrders at front
    assert.strictEqual(pendingOrders[0].id, allOrders[0].id);
    assert.strictEqual(pendingOrders[0].status, 'PENDING');
    assert.strictEqual(pendingOrders[0].bot, null);

    const logs = fs.readFileSync(RESULT_FILE, 'utf8');
    assert.ok(logs.includes('destroyed while processing'));
  });

  await runTest('Remove bot from empty system does nothing', async () => {
    removeBot(); // no bot exists
    assert.strictEqual(bots.length, 0);

    const logs = fs.readFileSync(RESULT_FILE, 'utf8');
    // Should not throw, logs may be empty
    assert.ok(true);
  });

}

// Start the tests
runAllTests();